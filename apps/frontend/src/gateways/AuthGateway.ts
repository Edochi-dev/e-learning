import type { LoginCredentials, AuthResponse, RegisterPayload, User } from '@maris-nails/shared';

export interface AuthGateway {
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(payload: RegisterPayload): Promise<User>;
}
