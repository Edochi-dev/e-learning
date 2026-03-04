import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class DownloadCertificateBatchDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
