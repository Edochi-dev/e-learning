import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { EditCertificateTemplateDto } from '../dto/edit-certificate-template.dto';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import {
  DEFAULT_NAME_STYLE,
  DEFAULT_QR_STYLE,
  DEFAULT_DATE_STYLE,
} from '../value-objects';

/**
 * EditCertificateTemplateUseCase
 *
 * Edita una plantilla existente. Soporta tres modos:
 *
 *   1. Solo metadata (no llega file): actualiza name/courseAbbreviation/paperFormat
 *      según los campos presentes en el DTO.
 *
 *   2. Solo PDF (DTO vacío + file): reemplaza el PDF base, recalcula dimensiones,
 *      y si las dimensiones cambian respecto al PDF anterior RESETEA las posiciones
 *      a sus defaults — porque las coordenadas absolutas viejas (en puntos PDF)
 *      probablemente caen fuera de la nueva página y dejarían la plantilla en un
 *      estado visualmente roto. Después el frontend redirige al picker para que
 *      el admin reposicione conscientemente.
 *
 *   3. Ambos: combinación de los anteriores.
 *
 * INVARIANTE FUNDAMENTAL DE PROD:
 *
 *   Esta operación NO toca ningún certificado ya emitido. Los certificados
 *   guardan su propio PDF rasterizado en disco (independiente del PDF base de
 *   la plantilla) y desde el commit anterior también guardan su `templateSnapshot`
 *   inmutable. Editar la plantilla SOLO afecta a generaciones futuras.
 *
 * Orden de operaciones cuando se reemplaza el PDF (importa para atomicidad):
 *
 *   1. findOne — validar que la plantilla existe.
 *   2. pdf-lib.load(buffer) — leer dimensiones del PDF nuevo. Si está corrupto,
 *      fallamos AHORA sin haber tocado nada.
 *   3. saveFile(nuevo) — el storage ahora tiene los DOS PDFs (viejo y nuevo).
 *   4. update(BD) — la BD ahora apunta al nuevo. Punto de no retorno.
 *   5. deleteByUrl(viejo) — limpieza best-effort. Si falla por permisos o lo
 *      que sea, NO revertimos: la BD ya está consistente y solo dejamos un
 *      archivo huérfano. Lo logueamos como warning para que el admin se entere
 *      sin que la operación falle de cara al usuario.
 *
 * Si invirtiéramos el orden (borrar viejo → guardar nuevo → BD), un fallo en
 * el guardado dejaría a la plantilla sin PDF base alguno: las generaciones
 * futuras tirarían un 500 al intentar leer un archivo inexistente. El orden
 * actual garantiza que en cualquier punto de fallo o el viejo o el nuevo PDF
 * existen y son referenciables.
 */
@Injectable()
export class EditCertificateTemplateUseCase {
  private readonly logger = new Logger(EditCertificateTemplateUseCase.name);

  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(
    id: string,
    dto: EditCertificateTemplateDto,
    file?: Express.Multer.File,
  ): Promise<CertificateTemplate> {
    // 1. Validar existencia de la plantilla
    const existing = await this.templateGateway.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Plantilla ${id} no encontrada`);
    }

    // 2. Construir el payload de actualización SOLO con los campos
    //    que efectivamente vinieron. Esto es PATCH semántico estricto:
    //    no escribimos undefined ni pisamos campos no enviados.
    const payload: Partial<CertificateTemplate> = {};

    if (dto.name !== undefined) {
      payload.name = dto.name;
    }
    if (dto.courseAbbreviation !== undefined) {
      payload.courseAbbreviation = dto.courseAbbreviation.toUpperCase();
    }
    if (dto.paperFormat !== undefined) {
      payload.paperFormat = dto.paperFormat;
    }

    // 3. Si se subió un PDF nuevo, procesarlo
    let oldFilePathToDelete: string | null = null;

    if (file) {
      // 3a. Leer dimensiones del PDF nuevo (operación de dominio).
      //     Falla atómica: si el PDF está corrupto, no hemos escrito nada.
      const pdfDoc = await PDFDocument.load(file.buffer);
      const firstPage = pdfDoc.getPages()[0];
      const { width: newWidth, height: newHeight } = firstPage.getSize();

      // 3b. Guardar el PDF nuevo en el storage. A partir de aquí, el storage
      //     contiene tanto el viejo como el nuevo. La BD aún apunta al viejo.
      const newFilePath = await this.fileStorageGateway.saveFile(
        file,
        'certificates/templates',
      );

      payload.filePath = newFilePath;
      payload.pageWidth = newWidth;
      payload.pageHeight = newHeight;

      // 3c. Si las dimensiones cambiaron, las posiciones absolutas viejas
      //     ya no son válidas. Reseteamos a defaults para evitar dejar la
      //     plantilla en un estado visualmente roto.
      const dimensionsChanged =
        existing.pageWidth !== newWidth || existing.pageHeight !== newHeight;

      if (dimensionsChanged) {
        payload.nameStyle = { ...DEFAULT_NAME_STYLE };
        payload.qrStyle = { ...DEFAULT_QR_STYLE };
        payload.dateStyle = { ...DEFAULT_DATE_STYLE };
      }

      // Marcamos el viejo para borrado, pero NO lo borramos todavía.
      // El borrado ocurre DESPUÉS de que la BD esté consistente.
      oldFilePathToDelete = existing.filePath;
    }

    // 4. Actualizar la BD. Si esto falla, el archivo nuevo queda huérfano
    //    en el storage pero la plantilla sigue funcionando con el viejo.
    const updated = await this.templateGateway.update(id, payload);

    // 5. Limpieza best-effort del PDF viejo. La BD ya está consistente:
    //    cualquier fallo aquí solo deja basura en el storage, no rompe nada.
    if (oldFilePathToDelete) {
      try {
        await this.fileStorageGateway.deleteByUrl(oldFilePathToDelete);
      } catch (err) {
        this.logger.warn(
          `No se pudo borrar el PDF anterior ${oldFilePathToDelete} tras editar la plantilla ${id}: ${(err as Error).message}. La plantilla quedó actualizada correctamente; el archivo huérfano se puede limpiar manualmente.`,
        );
      }
    }

    return updated;
  }
}
