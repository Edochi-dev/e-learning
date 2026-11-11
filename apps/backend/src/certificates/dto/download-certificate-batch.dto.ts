import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsUUID,
  IsIn,
  IsOptional,
} from 'class-validator';
import {
  BUNDLE_LAYOUTS,
  type BundleLayout,
} from '../services/certificate-bundler';

export class DownloadCertificateBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100, {
    message: 'Cannot download more than 100 certificates at once',
  })
  @IsUUID('4', { each: true })
  ids: string[];

  // Absent → 'separate' (ZIP), the behaviour before this option existed.
  @IsOptional()
  @IsIn(BUNDLE_LAYOUTS, {
    message: `layout debe ser uno de: ${BUNDLE_LAYOUTS.join(', ')}`,
  })
  layout?: BundleLayout;
}
