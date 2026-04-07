import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { CreateCertificateTemplateDto } from '../dto/create-certificate-template.dto';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * UploadCertificateTemplateUseCase
 *
 * Recibe el archivo PDF plantilla y los metadatos del formulario.
 * Lee las dimensiones reales del PDF con pdf-lib y persiste todo en BD.
 *
 * ¿Por qué pdf-lib vive en el use case y FileStorageGateway lo abstrae todo?
 *
 *   - Leer las dimensiones de un PDF NO es un detalle de almacenamiento; es
 *     una operación de DOMINIO (el negocio necesita esos datos para que el
 *     picker visual funcione). Por eso vive aquí, en el use case, en el
 *     mismo nivel conceptual que "calcular el número correlativo" o "validar
 *     el courseAbbreviation".
 *
 *   - Guardar bytes en disco SÍ es un detalle de almacenamiento. Por eso
 *     se delega a FileStorageGateway.saveFile() — el use case no sabe ni
 *     dónde se guarda, ni cómo se nombra el archivo, ni qué prefijo lleva
 *     la URL pública. Mañana migramos a S3 cambiando solo el binding del
 *     gateway en StorageModule.
 *
 * Antes de este refactor, este use case importaba `fs/promises`, `path`
 * y `crypto` directamente para hacer mkdir/writeFile/randomUUID — tres
 * importaciones de detalles de infraestructura que NO debían vivir en
 * la capa de aplicación. Ahora todo eso es responsabilidad del gateway.
 */
@Injectable()
export class UploadCertificateTemplateUseCase {
  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(
    dto: CreateCertificateTemplateDto,
    file: Express.Multer.File,
  ): Promise<CertificateTemplate> {
    // 1. Leer las dimensiones del PDF (operación de dominio).
    //    Trabajamos sobre el buffer en memoria, ANTES de persistir, porque
    //    necesitamos las dimensiones para guardarlas en la BD junto con el
    //    archivo. Si el PDF estuviera corrupto, fallaríamos aquí sin haber
    //    escrito nada al storage — atómico de facto.
    const pdfDoc = await PDFDocument.load(file.buffer);
    const firstPage = pdfDoc.getPages()[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // 2. Persistir el archivo via el gateway. El use case no sabe dónde
    //    vive físicamente ni cómo se construye la URL pública.
    const filePath = await this.fileStorageGateway.saveFile(
      file,
      'certificates/templates',
    );

    // 3. Persistir el registro de plantilla en la base de datos.
    return this.templateGateway.create({
      name: dto.name,
      courseAbbreviation: dto.courseAbbreviation.toUpperCase(),
      filePath,
      pageWidth,
      pageHeight,
      paperFormat: dto.paperFormat,
    });
  }
}
