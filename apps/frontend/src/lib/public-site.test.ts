import { describe, it, expect } from 'vitest';
import { UserRole, type User } from '@maris-nails/shared';
import { canSeePublicSite, homePathFor } from './public-site';

const userWith = (role: UserRole) => ({ id: 'u1', email: 'a@b.c', fullName: 'Ana', role }) as User;

describe('canSeePublicSite', () => {
    it('mientras dure el "Próximamente", solo las admin ven el sitio público', () => {
        expect(canSeePublicSite(userWith(UserRole.ADMIN))).toBe(true);
        expect(canSeePublicSite(userWith(UserRole.STUDENT))).toBe(false);
        expect(canSeePublicSite(null)).toBe(false);
    });
});

describe('homePathFor', () => {
    it('la alumna con sesión va a su portal, no al "Próximamente"', () => {
        expect(homePathFor(userWith(UserRole.STUDENT))).toBe('/mis-cursos');
    });

    it('las admin y las visitantes van al inicio', () => {
        expect(homePathFor(userWith(UserRole.ADMIN))).toBe('/');
        expect(homePathFor(null)).toBe('/');
    });
});
