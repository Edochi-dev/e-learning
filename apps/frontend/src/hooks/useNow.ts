import { useEffect, useState } from 'react';

/** La hora actual, renovada cada `intervalMs`: para cuentas regresivas y fases. */
export function useNow(intervalMs: number): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}
