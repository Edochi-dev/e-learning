import type { LoginCredentials, AuthResponse, RegisterPayload, User } from '@maris-nails/shared';
import type { AuthGateway } from './AuthGateway';

export class HttpAuthGateway implements AuthGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await fetch(`${this.baseUrl}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Login failed: ${response.statusText}`);
        }

        return response.json();
    }

    async register(payload: RegisterPayload): Promise<User> {
        const response = await fetch(`${this.baseUrl}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear la cuenta');
        }

        return response.json();
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/users/me/password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al cambiar la contraseña');
        }
    }

    async logout(): Promise<void> {
        await fetch(`${this.baseUrl}/users/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    }

    async getMe(): Promise<User | null> {
        const res = await fetch(`${this.baseUrl}/users/me`, {
            credentials: 'include',
        });
        if (!res.ok) return null;
        return res.json();
    }
}
