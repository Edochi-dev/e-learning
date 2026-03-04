import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateTemplatePositionsDto {
    @IsNumber()
    namePositionX: number;

    @IsNumber()
    namePositionY: number;

    @IsNumber()
    nameFontSize: number;

    @IsString()
    nameColor: string;

    @IsNumber()
    qrPositionX: number;

    @IsNumber()
    qrPositionY: number;

    @IsNumber()
    qrSize: number;

    @IsString()
    fontFamily: string;
}
