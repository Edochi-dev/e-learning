import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { EditCertificateTemplateDto } from './dto/edit-certificate-template.dto';
import { UpdateTemplatePositionsDto } from './dto/update-template-positions.dto';
import { GenerateCertificateBatchDto } from './dto/generate-certificate-batch.dto';
import { DownloadCertificateBatchDto } from './dto/download-certificate-batch.dto';
import { UploadCertificateTemplateUseCase } from './use-cases/upload-certificate-template.use-case';
import { EditCertificateTemplateUseCase } from './use-cases/edit-certificate-template.use-case';
import { UpdateTemplatePositionsUseCase } from './use-cases/update-template-positions.use-case';
import { ListCertificateTemplatesUseCase } from './use-cases/list-certificate-templates.use-case';
import { GetCertificateTemplateUseCase } from './use-cases/get-certificate-template.use-case';
import { GenerateCertificateBatchUseCase } from './use-cases/generate-certificate-batch.use-case';
import { GetCertificateUseCase } from './use-cases/get-certificate.use-case';
import { DownloadCertificateBatchUseCase } from './use-cases/download-certificate-batch.use-case';
import { DeleteCertificateTemplateUseCase } from './use-cases/delete-certificate-template.use-case';
import type { CertAction } from './use-cases/delete-certificate-template.use-case';
import { DeleteCertificateUseCase } from './use-cases/delete-certificate.use-case';
import { LookupCertificateUseCase } from './use-cases/lookup-certificate.use-case';
import { CertificateGateway } from './gateways/certificate.gateway';

@Controller()
export class CertificatesController {
  constructor(
    private readonly uploadTemplateUseCase: UploadCertificateTemplateUseCase,
    private readonly editTemplateUseCase: EditCertificateTemplateUseCase,
    private readonly updatePositionsUseCase: UpdateTemplatePositionsUseCase,
    private readonly listTemplatesUseCase: ListCertificateTemplatesUseCase,
    private readonly getTemplateUseCase: GetCertificateTemplateUseCase,
    private readonly generateBatchUseCase: GenerateCertificateBatchUseCase,
    private readonly getCertificateUseCase: GetCertificateUseCase,
    private readonly downloadBatchUseCase: DownloadCertificateBatchUseCase,
    private readonly certificateGateway: CertificateGateway,
    private readonly deleteTemplateUseCase: DeleteCertificateTemplateUseCase,
    private readonly deleteCertificateUseCase: DeleteCertificateUseCase,
    private readonly lookupCertificateUseCase: LookupCertificateUseCase,
  ) {}

  // ==========================================
  // Rutas de Admin (requieren rol ADMIN)
  // ==========================================

  @Post('admin/certificate-templates')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadTemplate(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
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
  updatePositions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplatePositionsDto,
  ) {
    return this.updatePositionsUseCase.execute(id, dto);
  }

  /**
   * PATCH /admin/certificate-templates/:id
   *
   * Edita una plantilla existente. Soporta:
   *   - Solo metadata: petición JSON con name/courseAbbreviation/paperFormat
   *   - Reemplazo de PDF base: multipart/form-data con campo 'file'
   *   - Combinación de ambos
   *
   * Endpoint separado de /:id/positions porque las posiciones tienen su propio
   * flujo (picker visual) y no se mezclan con la edición de metadata + PDF.
   *
   * SAFETY: esta operación NO toca certificados ya emitidos. Cada certificado
   * tiene su propio PDF rasterizado en disco y un templateSnapshot inmutable
   * que congeló los metadatos en el momento de emisión.
   */
  @Patch('admin/certificate-templates/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  editTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditCertificateTemplateDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.editTemplateUseCase.execute(id, dto, file);
  }

  @Get('admin/certificate-templates')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  listTemplates() {
    return this.listTemplatesUseCase.execute();
  }

  @Get('admin/certificate-templates/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.getTemplateUseCase.execute(id);
  }

  @Delete('admin/certificate-templates/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('certAction') certAction: CertAction = 'keep',
  ) {
    return this.deleteTemplateUseCase.execute(id, certAction);
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
  listCertificates(@Query('search') search?: string) {
    const term = search?.trim().slice(0, 200);
    if (term) {
      return this.certificateGateway.search(term);
    }
    return this.certificateGateway.findAll();
  }

  @Post('admin/certificates/download')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async downloadBatch(
    @Body() dto: DownloadCertificateBatchDto,
    @Res() res: Response,
  ) {
    const result = await this.downloadBatchUseCase.execute(dto.ids);

    const contentType = result.isZip ? 'application/zip' : 'application/pdf';
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
    });
    res.send(result.buffer);
  }

  @Delete('admin/certificates/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteCertificate(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteCertificateUseCase.execute(id);
  }

  // ==========================================
  // Rutas Públicas (verificación de certificado)
  // ==========================================

  @Get('certificates/lookup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  lookupCertificate(@Query('number') number: string) {
    return this.lookupCertificateUseCase.execute(number ?? '');
  }

  @Get('certificates/:id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  getCertificate(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCertificateUseCase.execute(id);
  }
}
