import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetSignedUrlUseCase } from './get-signed-url.use-case';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { VideoTokenService } from '../video-token.service';
import { Lesson } from '../../courses/entities/lessons.entity';

/**
 * Tests para GetSignedUrlUseCase — generación de URLs firmadas para videos.
 *
 * ¿Por qué URLs firmadas en lugar de servir los videos directamente?
 *
 *   El tag <video src="..."> del navegador NO puede enviar headers HTTP
 *   (como Authorization: Bearer ...). Entonces el JWT del alumno no llega.
 *
 *   Solución: el frontend pide una URL firmada (con JWT), y luego usa
 *   esa URL temporal como src del <video>. El token va en el query string,
 *   no en un header — así el navegador lo envía automáticamente.
 *
 * Escenarios:
 *   1. Lección no existe → NotFoundException
 *   2. Lección sin video (examen) → NotFoundException
 *   3. Video externo (YouTube) → retorna URL original sin firmar
 *   4. Video local → genera token y retorna URL firmada
 *   5. URL con host completo → extrae solo el pathname
 */
describe('GetSignedUrlUseCase', () => {
  let useCase: GetSignedUrlUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let videoTokenService: jest.Mocked<VideoTokenService>;

  const lessonId = 'lesson-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GetSignedUrlUseCase,
        {
          provide: LessonGateway,
          useValue: { findLesson: jest.fn() },
        },
        {
          provide: VideoTokenService,
          useValue: { generateToken: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetSignedUrlUseCase);
    lessonGateway = module.get(LessonGateway);
    videoTokenService = module.get(VideoTokenService) as jest.Mocked<VideoTokenService>;
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: lección no existe
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  // ──────────────────────────────────────────────────────────
  // 2. VALIDACIÓN: lección sin video
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no tiene video (es un examen)', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: null,
    } as unknown as Lesson);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  // ──────────────────────────────────────────────────────────
  // 3. Video externo — retorna URL original sin firmar
  // ──────────────────────────────────────────────────────────

  /**
   * Si el video es de YouTube o Vimeo, no necesitamos firmarlo.
   * Retornamos la URL tal cual con expires: 0.
   */
  it('retorna la URL original si el video es externo (YouTube)', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: { videoUrl: 'https://youtube.com/watch?v=abc123' },
    } as unknown as Lesson);

    const result = await useCase.execute(lessonId);

    expect(result.url).toBe('https://youtube.com/watch?v=abc123');
    expect(result.expires).toBe(0);
    expect(videoTokenService.generateToken).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 4. Video local — genera URL firmada
  // ──────────────────────────────────────────────────────────

  it('genera una URL firmada para videos locales', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: { videoUrl: '/static/videos/clase1.mp4' },
    } as unknown as Lesson);

    videoTokenService.generateToken.mockReturnValue({
      token: 'signed-token-123',
      expires: 1700007200000,
    });

    const result = await useCase.execute(lessonId);

    expect(videoTokenService.generateToken).toHaveBeenCalledWith('videos/clase1.mp4');
    expect(result.url).toContain('/videos/stream?path=');
    expect(result.url).toContain('token=signed-token-123');
    expect(result.expires).toBe(1700007200000);
  });

  // ──────────────────────────────────────────────────────────
  // 5. URL con host completo — extrae solo el pathname
  // ──────────────────────────────────────────────────────────

  /**
   * Si el admin guardó la URL completa ("http://localhost:3000/static/videos/clase1.mp4"),
   * el Use Case extrae solo el pathname ("/static/videos/clase1.mp4") para procesarla.
   */
  it('normaliza URLs con host completo extrayendo solo el pathname', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: { videoUrl: 'http://localhost:3000/static/videos/clase1.mp4' },
    } as unknown as Lesson);

    videoTokenService.generateToken.mockReturnValue({
      token: 'token-abc',
      expires: 1700007200000,
    });

    const result = await useCase.execute(lessonId);

    // Debe haber extraído solo "videos/clase1.mp4", no la URL completa
    expect(videoTokenService.generateToken).toHaveBeenCalledWith('videos/clase1.mp4');
    expect(result.url).toContain('token=token-abc');
  });
});
