import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';

export class DeleteCertificateBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100, {
    message: 'Cannot delete more than 100 certificates at once',
  })
  @IsUUID('4', { each: true })
  ids: string[];
}
