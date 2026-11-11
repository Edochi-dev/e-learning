import { useEffect, useState } from 'react';
import type { CorrectionGateway } from '../gateways/CorrectionGateway';

/**
 * Cuántas entregas esperan corrección. Se vuelve a pedir cuando cambia
 * `refreshKey` (p. ej. la ruta), para que baje tras revisar una entrega.
 * Con `enabled` en false no consulta nada (alumnas y visitantes).
 */
export const usePendingCorrectionsCount = (
    gateway: CorrectionGateway,
    enabled = true,
    refreshKey?: unknown,
): number => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        gateway
            .listPending()
            .then((submissions) => { if (!cancelled) setCount(submissions.length); })
            .catch(() => { if (!cancelled) setCount(0); });
        return () => { cancelled = true; };
    }, [gateway, enabled, refreshKey]);

    return enabled ? count : 0;
};
