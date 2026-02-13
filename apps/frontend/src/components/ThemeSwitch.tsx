import React from 'react';

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
                <span className="icon-sun">☀️</span>
                <span className="icon-moon">🌙</span>
            </span>
        </label>
    );
};
