import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * UpdateProfileDto — Datos editables del perfil del usuario autenticado.
 *
 * Por ahora solo el nombre. El email NO se edita aquí (cambiarlo tiene
 * implicaciones de identidad/login que merecerían su propio flujo verificado).
 */
export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(100, { message: 'El nombre es demasiado largo.' })
  fullName: string;
}
