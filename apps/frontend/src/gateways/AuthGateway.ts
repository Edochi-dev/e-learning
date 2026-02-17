import type { LoginCredentials, AuthResponse } from '@maris-nails/shared';

export interface AuthGateway {
    login(credentials: LoginCredentials): Promise<AuthResponse>;
}
