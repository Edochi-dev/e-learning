import {
    Controller, Get, Post, Patch, Delete, Body, Param, Res, UseGuards,
    UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
    HttpCode, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateTemplatePositionsDto } from './dto/update-template-positions.dto';
import { GenerateCertificateBatchDto } from './dto/generate-certificate-batch.dto';
import { DownloadCertificateBatchDto } from './dto/download-certificate-batch.dto';
import { UploadCertificateTemplateUseCase } from './use-cases/upload-certificate-template.use-case';
import { UpdateTemplatePositionsUseCase } from './use-cases/update-template-positions.use-case';
import { ListCertificateTemplatesUseCase } from './use-cases/list-certificate-templates.use-case';
import { GenerateCertificateBatchUseCase } from './use-cases/generate-certificate-batch.use-case';
import { GetCertificateUseCase } from './use-cases/get-certificate.use-case';
import { DownloadCertificateBatchUseCase } from './use-cases/download-certificate-batch.use-case';
import { DeleteCertificateTemplateUseCase } from './use-cases/delete-certificate-template.use-case';
import { CertificateGateway } from './gateways/certificate.gateway';

@Controller()
export class CertificatesController {
    constructor(
        private readonly uploadTemplateUseCase: UploadCertificateTemplateUseCase,
        private readonly updatePositionsUseCase: UpdateTemplatePositionsUseCase,
        private readonly listTemplatesUseCase: ListCertificateTemplatesUseCase,
        private readonly generateBatchUseCase: GenerateCertificateBatchUseCase,
        private readonly getCertificateUseCase: GetCertificateUseCase,
        private readonly downloadBatchUseCase: DownloadCertificateBatchUseCase,
        private readonly certificateGateway: CertificateGateway,
        private readonly deleteTemplateUseCase: DeleteCertificateTemplateUseCase,
    ) {}

    // ==========================================
    // Rutas de Admin (requieren rol ADMIN)
    // ==========================================

    @Post('admin/certificate-templates')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
    uploadTemplate(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: 'application/pdf' }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() dto: CreateCertificateTemplateDto,
    ) {
        return this.uploadTemplateUseCase.execute(dto, file);
    }

    @Patch('admin/certificate-templates/:id/positions')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    updatePositions(@Param('id') id: string, @Body() dto: UpdateTemplatePositionsDto) {
        return this.updatePositionsUseCase.execute(id, dto);
    }

    @Get('admin/certificate-templates')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    listTemplates() {
        return this.listTemplatesUseCase.execute();
    }

    @Delete('admin/certificate-templates/:id')
    @HttpCode(204)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteTemplate(@Param('id') id: string) {
        return this.deleteTemplateUseCase.execute(id);
    }

    @Post('admin/certificates/batch')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    generateBatch(@Body() dto: GenerateCertificateBatchDto) {
        return this.generateBatchUseCase.execute(dto);
    }

    @Get('admin/certificates')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    listCertificates() {
        return this.certificateGateway.findAll();
    }

    @Post('admin/certificates/download')
    @HttpCode(200)
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    async downloadBatch(@Body() dto: DownloadCertificateBatchDto, @Res() res: Response) {
        const result = await this.downloadBatchUseCase.execute(dto.ids);

        const contentType = result.isZip ? 'application/zip' : 'application/pdf';
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        });
        res.send(result.buffer);
    }

    // ==========================================
    // Rutas Públicas (verificación de certificado)
    // ==========================================

    @Get('certificates/:id')
    getCertificate(@Param('id') id: string) {
        return this.getCertificateUseCase.execute(id);
    }
}
