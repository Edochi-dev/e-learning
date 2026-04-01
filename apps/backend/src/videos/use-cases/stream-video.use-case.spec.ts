import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StreamVideoUseCase } from './stream-video.use-case';
import { VideoStreamGateway } from '../gateways/video-stream.gateway';
import { VideoTokenService } from '../video-token.service';

/**
 * Tests para StreamVideoUseCase — validación de token y streaming de video.
 *
 * Este es el "paso 2" del flujo de signed URLs:
 *   1. El frontend recibió la URL firmada de GetSignedUrlUseCase
 *   2. El <video src> del navegador llama a esta URL
 *   3. StreamVideoUseCase valida el token
 *   4. Si es válido → delega al VideoStreamGateway para el streaming
 *
 * Escenarios:
 *   - Parámetros faltantes → BadRequestException
 *   - Token inválido/expirado → ForbiddenException
 *   - Token válido → delega streaming al gateway
 */
describe('StreamVideoUseCase', () => {
  let useCase: StreamVideoUseCase;
  let videoStreamGateway: jest.Mocked<VideoStreamGateway>;
  let videoTokenService: jest.Mocked<VideoTokenService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        StreamVideoUseCase,
        {
          provide: VideoStreamGateway,
          useValue: { getVideoStream: jest.fn() },
        },
        {
          provide: VideoTokenService,
          useValue: { validateToken: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(StreamVideoUseCase);
    videoStreamGateway = module.get(VideoStreamGateway);
    videoTokenService = module.get(VideoTokenService) as jest.Mocked<VideoTokenService>;
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: parámetros requeridos
  // ──────────────────────────────────────────────────────────

  it('lanza BadRequestException si falta el path', async () => {
    await expect(
      useCase.execute('', 'some-token'),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si falta el token', async () => {
    await expect(
      useCase.execute('videos/clase1.mp4', ''),
    ).rejects.toThrow(BadRequestException);
  });

  // ──────────────────────────────────────────────────────────
  // 2. SEGURIDAD: token inválido o expirado
  // ──────────────────────────────────────────────────────────

  /**
   * Si el token fue manipulado (firma no coincide) o expiró,
   * VideoTokenService.validateToken devuelve false → 403.
   *
   * Esto impide que alguien copie una URL firmada y la use después
   * de que expire, o que cambie el path para acceder a otro video.
   */
  it('lanza ForbiddenException si el token es inválido', async () => {
    videoTokenService.validateToken.mockReturnValue(false);

    await expect(
      useCase.execute('videos/clase1.mp4', 'token-falso'),
    ).rejects.toThrow(ForbiddenException);

    // No debe intentar hacer streaming
    expect(videoStreamGateway.getVideoStream).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. HAPPY PATH: token válido → streaming
  // ──────────────────────────────────────────────────────────

  it('delega el streaming al gateway cuando el token es válido', async () => {
    videoTokenService.validateToken.mockReturnValue(true);

    const fakeStream = {
      stream: new StreamableFile(Buffer.from('video-data')),
      headers: { 'Content-Type': 'video/mp4' },
      statusCode: 200,
    };
    videoStreamGateway.getVideoStream.mockResolvedValue(fakeStream as any);

    const result = await useCase.execute(
      'videos/clase1.mp4',
      'valid-token',
      'bytes=0-1024', // Range header para streaming parcial
    );

    expect(videoTokenService.validateToken).toHaveBeenCalledWith(
      'valid-token',
      'videos/clase1.mp4',
    );
    expect(videoStreamGateway.getVideoStream).toHaveBeenCalledWith(
      'videos/clase1.mp4',
      'bytes=0-1024',
    );
    expect(result).toBe(fakeStream);
  });
});
