import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

/**
 * VideoTokenService — Genera y valida tokens firmados para URLs de video
 *
 * Piensa en esto como un "boleto de cine con fecha de vencimiento":
 * - El boleto tiene: qué video, hasta cuándo es válido, y una firma
 * - Si alguien cambia el video o la fecha, la firma no coincide → rechazado
 * - Si se venció, también se rechaza
 *
 * Usa HMAC-SHA256 para la firma (el mismo algoritmo que usan AWS y Cloudflare).
 */
@Injectable()
export class VideoTokenService {
    private readonly logger = new Logger(VideoTokenService.name);
    private readonly secret: string;
    private readonly expirationMs: number;

    constructor(private readonly configService: ConfigService) {
        // Usa JWT_SECRET como clave para firmar (ya existe en el .env)
        this.secret = this.configService.get<string>('JWT_SECRET')!;

        // Duración del token: 2 horas por defecto (configurable en .env)
        const hours = this.configService.get<number>('VIDEO_TOKEN_EXPIRY_HOURS', 2);
        this.expirationMs = hours * 60 * 60 * 1000;
    }

    /**
     * Genera un token firmado para un video específico.
     *
     * @param videoPath - Ruta relativa del video (ej: "videos/clase1.mp4")
     * @returns Objeto con el token y la fecha de expiración
     */
    generateToken(videoPath: string): { token: string; expires: number } {
        const expires = Date.now() + this.expirationMs;

        // La firma incluye: ruta del video + fecha de expiración
        // Si alguien cambia cualquiera de los dos, la firma ya no coincide
        const signature = this.createSignature(videoPath, expires);

        // El token final es: firma.expiración (separados por punto)
        const token = `${signature}.${expires}`;

        return { token, expires };
    }

    /**
     * Valida un token firmado.
     *
     * @param token - El token a validar
     * @param videoPath - La ruta del video que se quiere acceder
     * @returns true si es válido y no expiró, false si no
     */
    validateToken(token: string, videoPath: string): boolean {
        try {
            const parts = token.split('.');
            if (parts.length !== 2) {
                this.logger.warn('Token con formato inválido');
                return false;
            }

            const [signature, expiresStr] = parts;
            const expires = parseInt(expiresStr, 10);

            // ¿Expiró?
            if (Date.now() > expires) {
                this.logger.warn(`Token expirado para: ${videoPath}`);
                return false;
            }

            // ¿La firma coincide?
            const expectedSignature = this.createSignature(videoPath, expires);
            if (signature !== expectedSignature) {
                this.logger.warn(`Firma inválida para: ${videoPath}`);
                return false;
            }

            return true;
        } catch {
            this.logger.error('Error al validar token');
            return false;
        }
    }

    /**
     * Crea una firma HMAC-SHA256.
     * Solo alguien con el SECRET puede generar esta firma.
     */
    private createSignature(videoPath: string, expires: number): string {
        const data = `${videoPath}:${expires}`;
        return createHmac('sha256', this.secret).update(data).digest('hex');
    }
}
