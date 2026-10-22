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
  Req,
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
import { UpdateTemplateDesignDto } from './dto/update-template-design.dto';
import { GenerateCertificateBatchDto } from './dto/generate-certificate-batch.dto';
import { DownloadCertificateBatchDto } from './dto/download-certificate-batch.dto';
import { DeleteCertificateBatchDto } from './dto/delete-certificate-batch.dto';
import { SearchCertificatesQueryDto } from './dto/search-certificates-query.dto';
import { UploadCertificateTemplateUseCase } from './use-cases/upload-certificate-template.use-case';
import { EditCertificateTemplateUseCase } from './use-cases/edit-certificate-template.use-case';
import { UpdateTemplateDesignUseCase } from './use-cases/update-template-design.use-case';
import { PreviewTemplateDesignUseCase } from './use-cases/preview-template-design.use-case';
import { PreviewTemplateDesignDto } from './dto/preview-template-design.dto';
import { GenerateBlankCertificatesUseCase } from './use-cases/generate-blank-certificates.use-case';
import { GenerateBlankCertificatesDto } from './dto/generate-blank-certificates.dto';
import { ListCertificateTemplatesUseCase } from './use-cases/list-certificate-templates.use-case';
import { GetCertificateTemplateUseCase } from './use-cases/get-certificate-template.use-case';
import { GenerateCertificateBatchUseCase } from './use-cases/generate-certificate-batch.use-case';
import { GetCertificateUseCase } from './use-cases/get-certificate.use-case';
import { DownloadCertificateBatchUseCase } from './use-cases/download-certificate-batch.use-case';
import { DeleteCertificateTemplateUseCase } from './use-cases/delete-certificate-template.use-case';
import type { CertAction } from './use-cases/delete-certificate-template.use-case';
import { DeleteCertificateBatchUseCase } from './use-cases/delete-certificate-batch.use-case';
import { SearchCertificatesUseCase } from './use-cases/search-certificates.use-case';
import { ListCertificateCoursesUseCase } from './use-cases/list-certificate-courses.use-case';
import { LookupCertificateUseCase } from './use-cases/lookup-certificate.use-case';
import { LookupCertificateDto } from './dto/lookup-certificate.dto';
import { GetMyCertificatesUseCase } from './use-cases/get-my-certificates.use-case';

@Controller()
export class CertificatesController {
  constructor(
    private readonly uploadTemplateUseCase: UploadCertificateTemplateUseCase,
    private readonly editTemplateUseCase: EditCertificateTemplateUseCase,
    private readonly updateDesignUseCase: UpdateTemplateDesignUseCase,
    private readonly previewDesignUseCase: PreviewTemplateDesignUseCase,
    private readonly generateBlankUseCase: GenerateBlankCertificatesUseCase,
    private readonly listTemplatesUseCase: ListCertificateTemplatesUseCase,
    private readonly getTemplateUseCase: GetCertificateTemplateUseCase,
    private readonly generateBatchUseCase: GenerateCertificateBatchUseCase,
    private readonly getCertificateUseCase: GetCertificateUseCase,
    private readonly downloadBatchUseCase: DownloadCertificateBatchUseCase,
    private readonly deleteTemplateUseCase: DeleteCertificateTemplateUseCase,
    private readonly deleteCertificateBatchUseCase: DeleteCertificateBatchUseCase,
    private readonly searchCertificatesUseCase: SearchCertificatesUseCase,
    private readonly listCertificateCoursesUseCase: ListCertificateCoursesUseCase,
    private readonly lookupCertificateUseCase: LookupCertificateUseCase,
    private readonly getMyCertificatesUseCase: GetMyCertificatesUseCase,
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

  /**
   * PATCH /admin/certificate-templates/:id/design
   *
   * Guarda el diseño visual completo de la plantilla: posiciones, tipografías,
   * tamaños, colores, alineaciones y visibilidad. Es lo que persiste el picker
   * visual del frontend cuando el admin pulsa "Guardar".
   *
   * Renombrado desde /positions: el endpoint anterior tenía nombre engañoso
   * porque sugería que solo guardaba coordenadas, cuando en realidad el body
   * incluye TODO el styling.
   */
  @Patch('admin/certificate-templates/:id/design')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  updateDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDesignDto,
  ) {
    return this.updateDesignUseCase.execute(id, dto);
  }

  /**
   * POST /admin/certificate-templates/:id/preview — PDF de muestra con el diseño
   * aún sin guardar, dibujado igual que un certificado real. No persiste nada.
   */
  @Post('admin/certificate-templates/:id/preview')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async previewDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewTemplateDesignDto,
    @Res() res: Response,
  ) {
    const pdf = await this.previewDesignUseCase.execute(id, dto);
    res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' });
    res.send(pdf);
  }

  /**
   * POST /admin/certificate-templates/:id/blank — copias de reserva con la
   * fecha y sin nombre ni QR. No crea certificados ni consume números.
   */
  @Post('admin/certificate-templates/:id/blank')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async generateBlank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateBlankCertificatesDto,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.generateBlankUseCase.execute(id, dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-store',
    });
    res.send(pdf);
  }

  /**
   * PATCH /admin/certificate-templates/:id
   *
   * Edita una plantilla existente. Soporta:
   *   - Solo metadata: petición JSON con name/courseAbbreviation/paperFormat
   *   - Reemplazo de PDF base: multipart/form-data con campo 'file'
   *   - Combinación de ambos
   *
   * Endpoint separado de /:id/design porque el diseño visual tiene su propio
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
  searchCertificates(@Query() query: SearchCertificatesQueryDto) {
    return this.searchCertificatesUseCase.execute(query.toCriteria());
  }

  @Get('admin/certificates/courses')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  listCertificateCourses() {
    return this.listCertificateCoursesUseCase.execute();
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

  // POST, not DELETE: request bodies on DELETE are not reliably supported.
  @Post('admin/certificates/delete')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteCertificateBatch(@Body() dto: DeleteCertificateBatchDto) {
    return this.deleteCertificateBatchUseCase.execute(dto.ids);
  }

  // ==========================================
  // Certificados del alumno autenticado
  // ==========================================

  // Debe declararse ANTES de 'certificates/:id' para que 'me' no se interprete
  // como un id. Devuelve solo los certificados ligados a este usuario.
  @Get('certificates/me')
  @UseGuards(AuthGuard('jwt'))
  getMyCertificates(@Req() req: { user: { id: string } }) {
    return this.getMyCertificatesUseCase.execute(req.user.id);
  }

  // ==========================================
  // Rutas Públicas (verificación de certificado)
  // ==========================================

  @Get('certificates/lookup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  lookupCertificate(@Query() query: LookupCertificateDto) {
    return this.lookupCertificateUseCase.execute(query.number, query.name);
  }

  @Get('certificates/:id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  getCertificate(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCertificateUseCase.execute(id);
  }
}
