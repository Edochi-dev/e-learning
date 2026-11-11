import { UserRole, type User } from '@maris-nails/shared';

/**
 * Único punto que decide si el sitio público (inicio, catálogo, fichas) está
 * abierto para alguien. Mientras dure el "Próximamente" solo lo ven las admin;
 * el lanzamiento (#28) se reduce a cambiar esta función.
 */
export const canSeePublicSite = (user: User | null): boolean => user?.role === UserRole.ADMIN;

/** A dónde lleva el logo: con el sitio cerrado, quien tiene sesión va a su portal. */
export const homePathFor = (user: User | null): string =>
    user && !canSeePublicSite(user) ? '/mis-cursos' : '/';
