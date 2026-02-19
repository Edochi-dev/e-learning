import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { FileStorageGateway } from './gateways/file-storage.gateway';

/**
 * LocalFileStorageGateway — Implementación concreta del FileStorageGateway
 *
 * Esta clase ES el detalle de implementación. Sabe que los archivos viven
 * en la carpeta "public/" del backend y que se sirven bajo "/static/".
 *
 * En Clean Architecture:
 * - El Use Case solo conoce el gateway ABSTRACTO (FileStorageGateway)
 * - NestJS inyecta ESTA clase concreta en tiempo de ejecución
 * - Si mañana migramos a AWS S3, creamos "S3FileStorageGateway" y solo
 *   cambiamos el binding en el module. El Use Case NO se toca.
 */
@Injectable()
export class LocalFileStorageGateway implements FileStorageGateway {
    private readonly logger = new Logger(LocalFileStorageGateway.name);

    /**
     * El prefijo que usamos en las URLs locales.
     * Configurado en app.module.ts como serveRoot: '/static'
     */
    private readonly STATIC_PREFIX = '/static/';

    /**
     * Ruta absoluta al directorio "public/" del backend.
     * __dirname apunta a dist/, así que subimos un nivel.
     */
    private readonly publicDir = join(__dirname, '..', 'public');

    /**
     * Convierte una URL como "/static/videos/clase1.mp4"
     * en una ruta del filesystem como "/home/.../backend/public/videos/clase1.mp4"
     * y la borra.
     */
    async deleteFile(filePath: string): Promise<void> {
        const absolutePath = join(this.publicDir, filePath);

        if (!existsSync(absolutePath)) {
            this.logger.warn(`Archivo no encontrado, omitiendo borrado: ${absolutePath}`);
            return;
        }

        try {
            await unlink(absolutePath);
            this.logger.log(`Archivo huérfano eliminado: ${absolutePath}`);
        } catch (error) {
            this.logger.error(`Error al eliminar archivo: ${absolutePath}`, error);
        }
    }

    /**
     * Detecta si una URL es un archivo local servido por nuestro backend.
     * Solo URLs que empiezan con "/static/" son locales.
     * URLs de YouTube, Vimeo, etc. retornan false.
     */
    isLocalFile(url: string): boolean {
        return url.startsWith(this.STATIC_PREFIX);
    }
}
