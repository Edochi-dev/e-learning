import {
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { UpdateTemplateDesignDto } from './update-template-design.dto';

/** El diseño aún sin guardar, más el nombre y la fecha de muestra. */
export class PreviewTemplateDesignDto extends UpdateTemplateDesignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  sampleName: string;

  // Del navegador, como en la emisión: el "hoy" del servidor puede ser otro día.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'sampleDate debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true }, { message: 'sampleDate no es una fecha válida' })
  sampleDate: string;
}
