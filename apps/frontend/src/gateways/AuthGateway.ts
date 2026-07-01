import type { LoginCredentials, AuthResponse, RegisterPayload, User } from '@maris-nails/shared';

export interface AuthGateway {
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(payload: RegisterPayload): Promise<User>;
    changePassword(currentPassword: string, newPassword: string): Promise<void>;
    /** Actualiza el perfil (por ahora el nombre) y devuelve el usuario actualizado. */
    updateProfile(fullName: string): Promise<User>;
    /** Paso 1 del reset: pide el enlace por email. No revela si el correo existe. */
    forgotPassword(email: string): Promise<void>;
    /** Paso 2 del reset: aplica la nueva contraseña con el token del enlace. */
    resetPassword(token: string, newPassword: string): Promise<void>;
    logout(): Promise<void>;

    /**
     * Restaura la sesión del usuario preguntando al backend.
     * Si hay una cookie HttpOnly válida, devuelve el usuario.
     * Si no hay sesión, devuelve null (no lanza error).
     */
    getMe(): Promise<User | null>;

    /** Lista todos los usuarios (solo ADMIN). Se usa para elegir alumnos al emitir certificados. */
    getAllUsers(): Promise<User[]>;
}
