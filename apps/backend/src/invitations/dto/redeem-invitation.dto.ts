import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Datos con los que la alumna crea su cuenta al canjear la invitación.
 *
 * Las reglas son las MISMAS que en el registro normal (CreateUserDto). Quien
 * entra por invitación acaba con una cuenta idéntica a cualquier otra: si aquí
 * se relajara la contraseña, el enlace se convertiría en una puerta trasera
 * para saltarse la política del registro.
 */
export class RedeemInvitationDto {
  @IsString()
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.',
  })
  password: string;
}
