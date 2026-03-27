import type { LoginCredentials, AuthResponse, RegisterPayload, User } from '@maris-nails/shared';

export interface AuthGateway {
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(payload: RegisterPayload): Promise<User>;
    changePassword(currentPassword: string, newPassword: string): Promise<void>;
    logout(): Promise<void>;

    /**
     * Restaura la sesión del usuario preguntando al backend.
     * Si hay una cookie HttpOnly válida, devuelve el usuario.
     * Si no hay sesión, devuelve null (no lanza error).
     */
    getMe(): Promise<User | null>;
}
