import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * RequestNameChangeDto — Lo que el alumno envía al solicitar un cambio de nombre.
 * Solo el nombre deseado; el userId sale del JWT, no del body.
 */
export class RequestNameChangeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre solicitado no puede estar vacío.' })
  @MaxLength(100, { message: 'El nombre es demasiado largo.' })
  requestedName: string;
}
