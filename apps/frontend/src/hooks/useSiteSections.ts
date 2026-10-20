import { useLocation, useNavigate } from 'react-router-dom';
import { smoothScrollToElement, getHeaderOffset } from '../lib/smoothScroll';

/** Destino del sitio público: una página o una sección de la home, con la misma interfaz. */
export interface SiteSection {
    label: string;
    href: string;
    go: () => void;
}

/**
 * Secciones del sitio público. Las de la home hacen scroll suave si ya se está
 * en ella; si no, navegan a la home y dejan en el state qué sección abrir.
 */
export const useSiteSections = (): SiteSection[] => {
    const navigate = useNavigate();
    const location = useLocation();

    const toHomeSection = (id: string) => () => {
        if (location.pathname === '/') {
            smoothScrollToElement(id, { offset: getHeaderOffset() });
        } else {
            navigate('/', { state: { scrollTo: id } });
        }
    };

    return [
        { label: 'Cursos', href: '/cursos', go: () => navigate('/cursos') },
        { label: 'Preguntas frecuentes', href: '#preguntas', go: toHomeSection('preguntas') },
        { label: 'Contacto', href: '#contacto', go: toHomeSection('contacto') },
    ];
};
