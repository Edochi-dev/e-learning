import { registerStaleChunkReload } from './stale-chunk-reload';

function setup(storage: Pick<Storage, 'getItem' | 'setItem'>, now = 100_000) {
    const target = new EventTarget();
    const reload = vi.fn();
    registerStaleChunkReload({
        target: target as unknown as Window,
        storage,
        reload,
        now: () => now,
    });
    const fire = () => {
        const event = new Event('vite:preloadError', { cancelable: true });
        target.dispatchEvent(event);
        return event;
    };
    return { reload, fire };
}

function memoryStorage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return {
        getItem: (key: string) => data[key] ?? null,
        setItem: (key: string, value: string) => { data[key] = value; },
    };
}

describe('registerStaleChunkReload', () => {
    it('recarga la página y suprime el error la primera vez', () => {
        const { reload, fire } = setup(memoryStorage());

        const event = fire();

        expect(reload).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
    });

    it('no vuelve a recargar si el error se repite enseguida', () => {
        const { reload, fire } = setup(memoryStorage({ 'stale-chunk-reload-at': '95000' }));

        const event = fire();

        expect(reload).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('vuelve a recargar cuando la recarga anterior fue hace rato', () => {
        const { reload, fire } = setup(memoryStorage({ 'stale-chunk-reload-at': '1000' }));

        fire();

        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('no recarga si el almacenamiento está bloqueado', () => {
        const blocked = {
            getItem: () => { throw new Error('SecurityError'); },
            setItem: () => { throw new Error('SecurityError'); },
        };
        const { reload, fire } = setup(blocked);

        const event = fire();

        expect(reload).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });
});
