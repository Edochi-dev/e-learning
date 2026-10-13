const STORAGE_KEY = 'stale-chunk-reload-at';
// A second failure inside this window means the reload did not help (the
// server is really missing the file), so the error is left to surface.
const RETRY_WINDOW_MS = 10_000;

interface Deps {
    target: Pick<Window, 'addEventListener'>;
    storage: Pick<Storage, 'getItem' | 'setItem'>;
    reload: () => void;
    now?: () => number;
}

/**
 * A tab opened before a deploy still references the previous build's chunk
 * hashes, which the server no longer has. Reloading fetches the new build.
 */
export function registerStaleChunkReload({ target, storage, reload, now = Date.now }: Deps): void {
    target.addEventListener('vite:preloadError', (event) => {
        let lastReload = 0;
        try {
            lastReload = Number(storage.getItem(STORAGE_KEY)) || 0;
        } catch {
            // Storage blocked: without the loop guard, do not risk reloading.
            return;
        }
        if (now() - lastReload < RETRY_WINDOW_MS) return;

        try {
            storage.setItem(STORAGE_KEY, String(now()));
        } catch {
            return;
        }
        event.preventDefault();
        reload();
    });
}
