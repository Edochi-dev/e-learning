import type { HttpClient, SessionExpiryNotifier } from './HttpClient';

/** A 401 from these means bad credentials or no session, never "renew and retry". */
const AUTH_PATHS = ['/users/login', '/users/refresh', '/users/logout'];

/**
 * Sends every request with the session cookies. On a 401 it renews the
 * session once and retries; if renewal fails, it tells the listeners the
 * session is over and hands back the original 401.
 */
export class SessionRefreshingHttpClient implements HttpClient, SessionExpiryNotifier {
    private readonly refreshUrl: string;
    private readonly listeners = new Set<() => void>();
    private pendingRefresh: Promise<boolean> | null = null;

    constructor(baseUrl: string) {
        this.refreshUrl = `${baseUrl}/users/refresh`;
    }

    async fetch(input: string | URL, init?: RequestInit): Promise<Response> {
        const response = await this.send(input, init);
        if (response.status !== 401 || this.isAuthRequest(input)) return response;

        if (!(await this.refreshOnce())) {
            this.listeners.forEach((listener) => listener());
            return response;
        }
        return this.send(input, init);
    }

    onSessionExpired(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private send(input: string | URL, init?: RequestInit): Promise<Response> {
        return window.fetch(input, { credentials: 'include', ...init });
    }

    // Ten requests failing together must trigger one refresh, not ten: each
    // refresh rotates the token, and the losers would present a stale one.
    private refreshOnce(): Promise<boolean> {
        this.pendingRefresh ??= window
            .fetch(this.refreshUrl, { method: 'POST', credentials: 'include' })
            .then((res) => res.ok, () => false)
            .finally(() => {
                this.pendingRefresh = null;
            });
        return this.pendingRefresh;
    }

    private isAuthRequest(input: string | URL): boolean {
        const path = new URL(input.toString(), window.location.origin).pathname;
        return AUTH_PATHS.some((authPath) => path.endsWith(authPath));
    }
}
