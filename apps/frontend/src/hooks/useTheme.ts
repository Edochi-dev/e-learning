import { useState, useEffect } from 'react';
import type { Theme, ThemeGateway } from '../gateways/ThemeGateway';

export const useTheme = (gateway: ThemeGateway) => {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // 1. Intentar recuperar del Gateway
        const savedTheme = gateway.getTheme();

        // 2. Si no hay nada guardado, usar preferencia del sistema
        if (!savedTheme) {
            try {
                const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(systemPrefersDark ? 'dark' : 'light');
            } catch (e) {
                console.warn('matchMedia not supported', e);
                setTheme('light');
            }
        } else {
            setTheme(savedTheme);
        }
    }, [gateway]);

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
