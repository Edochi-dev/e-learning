import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeSwitchProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ theme, toggleTheme }) => {
    return (
        <label className="theme-switch" aria-label="Toggle Dark Mode">
            <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={toggleTheme}
            />
            <span className="slider round">
                <Sun className="icon-sun" size={14} strokeWidth={2} aria-hidden="true" />
                <Moon className="icon-moon" size={14} strokeWidth={2} aria-hidden="true" />
            </span>
        </label>
    );
};
