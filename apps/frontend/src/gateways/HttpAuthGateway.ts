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
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Login failed: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            access_token: data.token, // El backend devuelve "token", el frontend espera "access_token"
            user: data.user,
        };
    }

    async register(payload: RegisterPayload): Promise<User> {
        const response = await fetch(`${this.baseUrl}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear la cuenta');
        }

        return response.json();
    }
}
