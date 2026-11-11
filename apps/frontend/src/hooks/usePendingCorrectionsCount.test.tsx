import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePendingCorrectionsCount } from './usePendingCorrectionsCount';
import type { CorrectionGateway } from '../gateways/CorrectionGateway';

const gatewayReturning = (pending: unknown[]) =>
    ({ listPending: vi.fn().mockResolvedValue(pending) }) as unknown as CorrectionGateway & {
        listPending: ReturnType<typeof vi.fn>;
    };

describe('usePendingCorrectionsCount', () => {
    it('cuenta las entregas pendientes', async () => {
        const gateway = gatewayReturning([{}, {}, {}]);
        const { result } = renderHook(() => usePendingCorrectionsCount(gateway));
        await waitFor(() => expect(result.current).toBe(3));
    });

    it('no consulta nada si está desactivado (alumnas y visitantes)', () => {
        const gateway = gatewayReturning([{}]);
        const { result } = renderHook(() => usePendingCorrectionsCount(gateway, false));
        expect(result.current).toBe(0);
        expect(gateway.listPending).not.toHaveBeenCalled();
    });

    it('vuelve a consultar cuando cambia la clave de refresco', async () => {
        const gateway = gatewayReturning([{}]);
        const { rerender } = renderHook(({ key }) => usePendingCorrectionsCount(gateway, true, key), {
            initialProps: { key: '/admin' },
        });
        await waitFor(() => expect(gateway.listPending).toHaveBeenCalledTimes(1));
        rerender({ key: '/admin/correcciones' });
        await waitFor(() => expect(gateway.listPending).toHaveBeenCalledTimes(2));
    });

    it('si la consulta falla, muestra 0 en vez de romper', async () => {
        const gateway = { listPending: vi.fn().mockRejectedValue(new Error('red')) } as unknown as CorrectionGateway;
        const { result } = renderHook(() => usePendingCorrectionsCount(gateway));
        await waitFor(() => expect(gateway.listPending).toHaveBeenCalled());
        expect(result.current).toBe(0);
    });
});
