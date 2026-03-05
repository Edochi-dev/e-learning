import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCertificateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    courseAbbreviation: string;

    @IsString()
    @IsIn(['A4', 'A3'])
    paperFormat: string;
}
