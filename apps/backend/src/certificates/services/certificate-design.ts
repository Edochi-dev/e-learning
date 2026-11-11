import { UpdateTemplateDesignDto } from '../dto/update-template-design.dto';
import { DEFAULT_QR_STYLE } from '../value-objects/qr-style.vo';
import { CertificateDesign } from './certificate-renderer';

/** Del formulario del diseñador al diseño del dominio; lo comparten guardar y la vista previa. */
export function toCertificateDesign(
  dto: UpdateTemplateDesignDto,
): CertificateDesign {
  return {
    nameStyle: dto.nameStyle,
    qrStyle: {
      ...dto.qrStyle,
      foregroundColor:
        dto.qrStyle.foregroundColor ?? DEFAULT_QR_STYLE.foregroundColor,
      backgroundColor:
        dto.qrStyle.backgroundColor ?? DEFAULT_QR_STYLE.backgroundColor,
    },
    dateStyle: dto.dateStyle,
  };
}
