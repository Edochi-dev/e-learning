import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterPayload } from '@maris-nails/shared';
import type { AuthGateway } from '../gateways/AuthGateway';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    gateway: AuthGateway;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, gateway }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem('access_token'));

    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
            setToken(storedToken);
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                const restoredUser = {
                    id: payload.sub,
                    email: payload.email,
                    role: payload.role,
                    fullName: payload.fullName || 'Usuario',
                } as User;
                setUser(restoredUser);
            } catch (e) {
                console.error('Error decoding token', e);
                localStorage.removeItem('access_token');
                setToken(null);
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const response = await gateway.login(credentials);

        if (!response.access_token) {
            throw new Error('No access token received');
        }

        setToken(response.access_token);
        setUser(response.user);
        localStorage.setItem('access_token', response.access_token);
    };

    /**
     * register — Crea la cuenta y luego hace auto-login.
     *
     * Flujo en dos pasos:
     *   1. POST /users → crea el usuario (backend hashea la contraseña con bcrypt)
     *   2. POST /users/login → obtiene el JWT y setea el estado de sesión
     *
     * El resultado final es idéntico a si el usuario hubiera hecho login manualmente:
     * queda autenticado sin necesidad de un segundo formulario.
     *
     * Importante: el confirmPassword NUNCA llega aquí; lo filtra el componente RegisterPage
     * antes de llamar a esta función.
     */
    const register = async (payload: RegisterPayload) => {
        await gateway.register(payload);
        await login({ email: payload.email, password: payload.password });
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
            register,
            logout,
            isAuthenticated: !!token,
            isLoading,
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
