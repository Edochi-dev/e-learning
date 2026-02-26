import { Injectable, Logger } from '@nestjs/common';
import { join, extname } from 'path';
import { unlink, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
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
     *
     * ¡Ojo con __dirname! Su valor depende de dónde vive ESTE archivo:
     *   - En dev:  src/storage/ → join('..', '..') → apps/backend/public/ ✓
     *   - En prod: dist/storage/ → join('..', '..') → apps/backend/public/ ✓
     *
     * Solo subir un nivel daría apps/backend/src/public/ o apps/backend/dist/public/,
     * que NO es donde ServeStaticModule sirve los archivos (él usa apps/backend/public/).
     */
    private readonly publicDir = join(__dirname, '..', '..', 'public');

    /**
     * Guarda un archivo subido en la carpeta public/{folder}/ y retorna su URL pública.
     *
     * Ejemplo:
     *   saveFile(file, 'thumbnails') → '/static/thumbnails/a1b2c3d4.jpg'
     *
     * ¿Por qué randomUUID() para el nombre?
     * Si dos admins suben "portada.jpg" a la vez, sin UUID se pisarían.
     * Con UUID cada archivo tiene un nombre irrepetible: "550e8400-e29b...jpg"
     */
    async saveFile(file: Express.Multer.File, folder: string): Promise<string> {
        // extname('foto.jpg') → '.jpg'   extname('imagen.PNG') → '.PNG'
        const ext = extname(file.originalname);
        const filename = `${randomUUID()}${ext}`;

        const destFolder = join(this.publicDir, folder);
        const destPath = join(destFolder, filename);

        // recursive: true crea la carpeta (y las intermedias) si no existen.
        // Sin esto, si 'thumbnails/' no existe, lanzaría un error.
        await mkdir(destFolder, { recursive: true });
        await writeFile(destPath, file.buffer);

        this.logger.log(`Archivo guardado: ${destPath}`);
        return `/static/${folder}/${filename}`;
    }

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
