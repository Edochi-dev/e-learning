import type { Theme, ThemeGateway } from './ThemeGateway';

export class LocalStorageThemeGateway implements ThemeGateway {
    private readonly STORAGE_KEY = 'mn_theme';

    getTheme(): Theme | null {
        const theme = localStorage.getItem(this.STORAGE_KEY);
        if (theme === 'light' || theme === 'dark') {
            return theme as Theme;
        }
        return null;
    }

    saveTheme(theme: Theme): void {
        localStorage.setItem(this.STORAGE_KEY, theme);
    }
}
