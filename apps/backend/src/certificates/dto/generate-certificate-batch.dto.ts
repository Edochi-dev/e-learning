import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty, ArrayMaxSize, MaxLength, IsUUID } from 'class-validator';

export class GenerateCertificateBatchDto {
    @IsUUID()
    templateId: string;

    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(100, { message: 'Cannot generate more than 100 certificates per batch' })
    @IsString({ each: true })
    @MaxLength(100, { each: true, message: 'Each name must be 100 characters or less' })
    names: string[];
}
