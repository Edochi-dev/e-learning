import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  password: string;
}
