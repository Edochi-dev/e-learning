import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCertificateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    courseAbbreviation: string;

    @IsString()
    @IsIn(['A4 Vertical', 'A4 Horizontal', 'A3 Vertical', 'A3 Horizontal'])
    paperFormat: string;
}
