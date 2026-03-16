import { IsNumber, IsString, IsOptional, IsBoolean, Matches, Min, Max, IsIn } from 'class-validator';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const ALIGN_VALUES = ['left', 'center'] as const;

export class UpdateTemplatePositionsDto {
    @IsNumber()
    @Min(0) @Max(2000)
    namePositionX: number;

    @IsNumber()
    @Min(0) @Max(2000)
    namePositionY: number;

    @IsNumber()
    @Min(1) @Max(300)
    nameFontSize: number;

    @Matches(HEX_COLOR, { message: 'nameColor must be a valid hex color (#RRGGBB)' })
    nameColor: string;

    @IsNumber()
    @Min(0) @Max(2000)
    qrPositionX: number;

    @IsNumber()
    @Min(0) @Max(2000)
    qrPositionY: number;

    @IsNumber()
    @Min(10) @Max(500)
    qrSize: number;

    @IsString()
    fontFamily: string;

    @IsOptional()
    @IsIn(ALIGN_VALUES)
    nameAlign?: string;

    // ── Fecha de emisión ──────────────────────────────────────────────────────
    @IsOptional()
    @IsBoolean()
    showDate?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0) @Max(2000)
    datePositionX?: number;

    @IsOptional()
    @IsNumber()
    @Min(0) @Max(2000)
    datePositionY?: number;

    @IsOptional()
    @IsNumber()
    @Min(1) @Max(300)
    dateFontSize?: number;

    @IsOptional()
    @Matches(HEX_COLOR, { message: 'dateColor must be a valid hex color (#RRGGBB)' })
    dateColor?: string;

    @IsOptional()
    @IsString()
    dateFontFamily?: string;

    @IsOptional()
    @IsIn(ALIGN_VALUES)
    dateAlign?: string;
}
