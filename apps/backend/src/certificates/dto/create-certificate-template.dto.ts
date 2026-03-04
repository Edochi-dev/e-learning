import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCertificateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    courseAbbreviation: string;
}
