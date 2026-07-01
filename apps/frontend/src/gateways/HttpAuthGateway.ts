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

    async updateProfile(fullName: string): Promise<User> {
        const response = await fetch(`${this.baseUrl}/users/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar el perfil');
        }

        return response.json();
    }

    async forgotPassword(email: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/users/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email }),
        });
        if (!res.ok) throw new Error('No se pudo procesar la solicitud. Intenta más tarde.');
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/users/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token, newPassword }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo restablecer la contraseña.');
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

    async getAllUsers(): Promise<User[]> {
        const res = await fetch(`${this.baseUrl}/users`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Error al cargar usuarios');
        return res.json();
    }
}
