export type Theme = 'light' | 'dark';

export interface ThemeGateway {
    getTheme(): Theme | null;
    saveTheme(theme: Theme): void;
}
