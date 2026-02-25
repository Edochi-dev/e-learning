import { IsEmail, IsString, Matches } from 'class-validator';

export class CreateUserDto {
    @IsString()
    fullName: string;

    @IsEmail()
    email: string;

    /**
     * Regla de contraseña:
     *   - Mínimo 8 caracteres
     *   - Al menos una letra (mayúscula o minúscula)
     *   - Al menos un número
     *
     * Regex: /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/
     *   (?=.*[a-zA-Z])  → lookahead: debe existir al menos una letra en cualquier posición
     *   (?=.*\d)        → lookahead: debe existir al menos un dígito en cualquier posición
     *   .{8,}           → en total, 8 o más caracteres
     */
    @IsString()
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
        message: 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.',
    })
    password: string;
}
