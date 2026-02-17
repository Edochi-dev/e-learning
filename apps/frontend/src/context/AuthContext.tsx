
import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials } from '@maris-nails/shared';
import type { AuthGateway } from '../gateways/AuthGateway';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    gateway: AuthGateway;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, gateway }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));

    useEffect(() => {
        // En una app real, aquí validaríamos el token con el backend al recargar
        // Por ahora confiamos en la presencia del token
        // Opcional: decodificar el JWT para obtener el usuario si está expirado
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await gateway.login(credentials);
            setToken(response.access_token);
            setUser(response.user);
            localStorage.setItem('access_token', response.access_token);
            // También podríamos guardar el usuario en localStorage si queremos persistencia offline simple
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
