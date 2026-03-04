import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty } from 'class-validator';

export class GenerateCertificateBatchDto {
    @IsString()
    @IsNotEmpty()
    templateId: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    names: string[];
}
