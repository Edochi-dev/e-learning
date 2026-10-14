export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
}

/** Web-push registration of this device for the agenda reminders (admin). */
export interface PushGateway {
    /** VAPID public key, or null while the server has push disabled. */
    getPublicKey(): Promise<string | null>;
    subscribe(endpoint: string, keys: PushSubscriptionKeys): Promise<void>;
}
