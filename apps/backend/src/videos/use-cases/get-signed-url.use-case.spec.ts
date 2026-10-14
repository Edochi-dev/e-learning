import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetSignedUrlUseCase } from './get-signed-url.use-case';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { VideoTokenService } from '../video-token.service';
import { Lesson } from '../../courses/entities/lessons.entity';
import { VideoLesson } from '../../courses/entities/video-lesson.entity';

// Real instances: the use case calls VideoLesson.isStreamOpenAt().
const video = (data: Partial<VideoLesson>) =>
  Object.assign(new VideoLesson(), { isLive: false, ...data });

/**
 * Tests para GetSignedUrlUseCase — generación de URLs firmadas para videos.
 *
 * Ahora usa FileStorageGateway.isLocalFile y toRelativePath en lugar de
 * hardcodear '/static/' directamente. El Use Case ya no conoce el prefijo.
 */
describe('GetSignedUrlUseCase', () => {
  let useCase: GetSignedUrlUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;
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
          provide: FileStorageGateway,
          useValue: {
            isLocalFile: jest.fn(),
            toRelativePath: jest.fn(),
          },
        },
        {
          provide: VideoTokenService,
          useValue: { generateToken: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetSignedUrlUseCase);
    lessonGateway = module.get(LessonGateway);
    fileStorageGateway = module.get(FileStorageGateway);
    videoTokenService = module.get(
      VideoTokenService,
    ) as jest.Mocked<VideoTokenService>;
  });

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  it('lanza NotFoundException si la lección no tiene video (es un examen)', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: null,
    } as unknown as Lesson);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  /**
   * Si el video es de YouTube o Vimeo, isLocalFile devuelve false.
   * Retornamos el enlace embebible de YouTube sin firmar, con expires: 0.
   */
  it('para YouTube devuelve el enlace embebible, sin firmar', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: video({ videoUrl: 'https://youtube.com/watch?v=abc123abc12' }),
    } as unknown as Lesson);

    fileStorageGateway.isLocalFile.mockReturnValue(false);

    const result = await useCase.execute(lessonId);

    expect(result.url).toBe(
      'https://www.youtube-nocookie.com/embed/abc123abc12',
    );
    expect(result.expires).toBe(0);
    expect(videoTokenService.generateToken).not.toHaveBeenCalled();
  });

  it('genera una URL firmada para videos locales usando toRelativePath', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: video({ videoUrl: '/static/videos/clase1.mp4' }),
    } as unknown as Lesson);

    fileStorageGateway.isLocalFile.mockReturnValue(true);
    fileStorageGateway.toRelativePath.mockReturnValue('videos/clase1.mp4');

    videoTokenService.generateToken.mockReturnValue({
      token: 'signed-token-123',
      expires: 1700007200000,
    });

    const result = await useCase.execute(lessonId);

    // Verifica que toRelativePath extrae la ruta — no el Use Case
    expect(fileStorageGateway.toRelativePath).toHaveBeenCalledWith(
      '/static/videos/clase1.mp4',
    );
    expect(videoTokenService.generateToken).toHaveBeenCalledWith(
      'videos/clase1.mp4',
    );
    expect(result.url).toContain('token=signed-token-123');
    expect(result.expires).toBe(1700007200000);
  });

  /**
   * Si el admin guardó la URL completa ("http://localhost:3000/static/videos/clase1.mp4"),
   * el Use Case extrae solo el pathname antes de pasarlo al gateway.
   */
  it('normaliza URLs con host completo extrayendo solo el pathname', async () => {
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      videoData: video({
        videoUrl: 'http://localhost:3000/static/videos/clase1.mp4',
      }),
    } as unknown as Lesson);

    fileStorageGateway.isLocalFile.mockReturnValue(true);
    fileStorageGateway.toRelativePath.mockReturnValue('videos/clase1.mp4');

    videoTokenService.generateToken.mockReturnValue({
      token: 'token-abc',
      expires: 1700007200000,
    });

    const result = await useCase.execute(lessonId);

    // isLocalFile recibe el pathname, no la URL completa con host
    expect(fileStorageGateway.isLocalFile).toHaveBeenCalledWith(
      '/static/videos/clase1.mp4',
    );
    expect(result.url).toContain('token=token-abc');
  });

  describe('clase en vivo', () => {
    const liveAt = (minutesFromNow: number) =>
      ({
        id: lessonId,
        videoData: video({
          videoUrl: '/static/videos/vivo.mp4',
          isLive: true,
          liveStartsAt: new Date(Date.now() + minutesFromNow * 60_000),
        }),
      }) as unknown as Lesson;

    beforeEach(() => {
      fileStorageGateway.isLocalFile.mockReturnValue(true);
      fileStorageGateway.toRelativePath.mockReturnValue('videos/vivo.mp4');
      videoTokenService.generateToken.mockReturnValue({
        token: 't',
        expires: 1,
      });
    });

    it('no entrega el enlace antes de que se abra la transmisión', async () => {
      lessonGateway.findLesson.mockResolvedValue(liveAt(60));

      await expect(useCase.execute(lessonId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(videoTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('lo entrega desde 15 minutos antes de empezar', async () => {
      lessonGateway.findLesson.mockResolvedValue(liveAt(10));

      await expect(useCase.execute(lessonId)).resolves.toMatchObject({
        expires: 1,
      });
    });

    it('lo sigue entregando después de la clase', async () => {
      lessonGateway.findLesson.mockResolvedValue(liveAt(-180));

      await expect(useCase.execute(lessonId)).resolves.toBeDefined();
    });
  });
});
