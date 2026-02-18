import { useState, useEffect } from 'react';
import type { Theme, ThemeGateway } from '../gateways/ThemeGateway';

export const useTheme = (gateway: ThemeGateway) => {
    // Inicializar estado lazy para evitar re-renderizados o efectos side-effects en render
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = gateway.getTheme();
        if (savedTheme) return savedTheme;

        // Si no hay guardado, intentar detectar preferencia
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        // 3. Aplicar efecto al DOM cuando cambia el tema
        document.documentElement.setAttribute('data-theme', theme);
        // 4. Persistir
        gateway.saveTheme(theme);
    }, [theme, gateway]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return { theme, toggleTheme };
};
