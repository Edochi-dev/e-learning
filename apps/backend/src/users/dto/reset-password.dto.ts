import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio.' })
  token: string;

  // Misma regla de fuerza que en el registro y el cambio de contraseña.
  @IsString()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.',
  })
  newPassword: string;
}
