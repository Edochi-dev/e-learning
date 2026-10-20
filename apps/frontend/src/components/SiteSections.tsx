import { useEffect, useRef, useState } from 'react';
import { ChevronRight, LogOut, Menu, X } from 'lucide-react';
import type { SiteSection } from '../hooks/useSiteSections';

const follow = (section: SiteSection) => (e: React.MouseEvent) => {
    e.preventDefault();
    section.go();
};

/** Las secciones en línea, para pantallas anchas. */
export const SiteSectionLinks = ({ sections }: { sections: SiteSection[] }) => (
    <nav className="nav-links nav-links--sections" aria-label="Secciones">
        {sections.map((section) => (
            <a key={section.href} href={section.href} onClick={follow(section)}>{section.label}</a>
        ))}
    </nav>
);

interface SiteMenuProps {
    sections: SiteSection[];
    // Solo para quien no tiene el menú del avatar en el teléfono (las alumnas).
    onLogout?: () => void;
}

/** Las secciones tras un botón "Menú", para el teléfono, y la salida de la sesión. */
export const SiteMenu = ({ sections, onLogout }: SiteMenuProps) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const closeOutside = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const closeOnEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    const choose = (section: SiteSection) => (e: React.MouseEvent) => {
        setOpen(false);
        follow(section)(e);
    };

    return (
        <div className="site-menu" ref={containerRef}>
            <button
                type="button"
                className="site-menu__toggle"
                aria-expanded={open}
                aria-controls="site-menu-panel"
                onClick={() => setOpen((prev) => !prev)}
            >
                {open ? <X className="site-menu__toggle-icon" aria-hidden /> : <Menu className="site-menu__toggle-icon" aria-hidden />}
                <span>{open ? 'Cerrar' : 'Menú'}</span>
            </button>

            {open && (
                <nav id="site-menu-panel" className="site-menu__panel" aria-label="Secciones">
                    {sections.map((section) => (
                        <a key={section.href} href={section.href} className="site-menu__item" onClick={choose(section)}>
                            <span>{section.label}</span>
                            <ChevronRight className="site-menu__chevron" aria-hidden />
                        </a>
                    ))}
                    {onLogout && (
                        <button
                            type="button"
                            className="site-menu__item site-menu__item--logout"
                            onClick={() => {
                                setOpen(false);
                                onLogout();
                            }}
                        >
                            <span>Cerrar sesión</span>
                            <LogOut className="site-menu__chevron" aria-hidden />
                        </button>
                    )}
                </nav>
            )}
        </div>
    );
};
