import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterPayload } from '@maris-nails/shared';
import type { AuthGateway } from '../gateways/AuthGateway';

interface AuthContextType {
    user: User | null;
    login: (credentials: LoginCredentials) => Promise<User>;
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
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Al montar, intentamos restaurar la sesión preguntando al backend via gateway.
    // Si hay una cookie HttpOnly válida, el browser la envía automáticamente
    // y el backend responde con los datos del usuario.
    // Si no hay cookie o expiró, gateway.getMe() devuelve null.
    useEffect(() => {
        gateway.getMe()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, [gateway]);

    const login = async (credentials: LoginCredentials): Promise<User> => {
        const response = await gateway.login(credentials);
        setUser(response.user);
        return response.user;
    };

    /**
     * register — Crea la cuenta y luego hace auto-login.
     *
     * Flujo en dos pasos:
     *   1. POST /users → crea el usuario (backend hashea la contraseña con bcrypt)
     *   2. POST /users/login → obtiene la cookie HttpOnly y setea el estado de sesión
     *
     * El resultado final es idéntico a si el usuario hubiera hecho login manualmente:
     * queda autenticado sin necesidad de un segundo formulario.
     */
    const register = async (payload: RegisterPayload) => {
        await gateway.register(payload);
        await login({ email: payload.email, password: payload.password });
    };

    const logout = async () => {
        await gateway.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            isAuthenticated: !!user,
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
