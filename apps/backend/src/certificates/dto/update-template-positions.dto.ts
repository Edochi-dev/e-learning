import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

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

    // ── Fecha de emisión ──────────────────────────────────────────────────────
    @IsOptional()
    @IsBoolean()
    showDate?: boolean;

    @IsOptional()
    @IsNumber()
    datePositionX?: number;

    @IsOptional()
    @IsNumber()
    datePositionY?: number;

    @IsOptional()
    @IsNumber()
    dateFontSize?: number;

    @IsOptional()
    @IsString()
    dateColor?: string;
}
