import { Injectable } from '@nestjs/common';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * UploadReferenceImageUseCase — Sube una imagen de referencia para una
 * lección tipo corrección.
 *
 * Flujo en el frontend:
 *   1. Admin selecciona la imagen en el form de lección
 *   2. Frontend llama a este endpoint → recibe la URL
 *   3. Frontend envía la URL en el payload de addLesson (JSON)
 *
 * ¿Por qué un upload separado en vez de multipart en addLesson?
 *   Porque addLesson recibe JSON para todos los tipos de lección.
 *   Meter multipart solo para un tipo rompería la uniformidad del
 *   contrato y complicaría el controller con condicionales por tipo.
 *   Un upload previo mantiene addLesson limpio y uniforme.
 */
@Injectable()
export class UploadReferenceImageUseCase {
  constructor(
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(file: Express.Multer.File): Promise<string> {
    return this.fileStorageGateway.saveFile(file, 'images');
  }
}
