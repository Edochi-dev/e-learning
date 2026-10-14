/** Same contract as window.fetch; gateways depend on this instead of the global. */
export interface HttpClient {
    fetch(input: string | URL, init?: RequestInit): Promise<Response>;
}

/** Lets the auth layer learn that the session could not be renewed. */
export interface SessionExpiryNotifier {
    onSessionExpired(listener: () => void): () => void;
}
