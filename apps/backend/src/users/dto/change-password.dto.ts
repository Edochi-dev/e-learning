import { IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message:
      'La nueva contraseña debe tener al menos 8 caracteres, incluyendo letras y números.',
  })
  newPassword: string;
}
