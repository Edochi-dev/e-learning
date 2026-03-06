import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';

@Injectable()
export class DeleteCertificateTemplateUseCase {
    private readonly publicDir = join(__dirname, '..', '..', '..', 'public');

    constructor(
        private readonly templateGateway: CertificateTemplateGateway,
        private readonly certificateGateway: CertificateGateway,
    ) {}

    async execute(id: string): Promise<void> {
        // 1. Verificar que la plantilla existe
        const template = await this.templateGateway.findOne(id);
        if (!template) throw new NotFoundException(`Plantilla ${id} no encontrada`);

        // 2. Verificar que no tiene certificados emitidos asociados
        const certificates = await this.certificateGateway.findByTemplateId(id);
        if (certificates.length > 0) {
            throw new BadRequestException(
                `No se puede eliminar: la plantilla tiene ${certificates.length} certificado(s) emitido(s).`,
            );
        }

        // 3. Borrar el archivo PDF del disco
        // filePath es '/static/certificates/templates/archivo.pdf'
        // El archivo real está en 'public/certificates/templates/archivo.pdf'
        const relativePath = template.filePath.replace('/static/', '');
        const absolutePath = join(this.publicDir, relativePath);
        await unlink(absolutePath).catch(() => {
            // Si el archivo ya no existe en disco, continuamos igual
        });

        // 4. Eliminar el registro de la base de datos
        await this.templateGateway.delete(id);
    }
}
