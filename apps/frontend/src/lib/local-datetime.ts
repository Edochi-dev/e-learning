// <input type="datetime-local"> works in the user's wall-clock time with no
// zone, while the API stores instants. These convert at that boundary only.

const pad = (n: number) => String(n).padStart(2, '0');

/** Instant (ISO with zone) → "YYYY-MM-DDTHH:MM" in this browser's time zone. */
export function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:MM" read as this browser's local time → ISO instant (UTC). */
export function localInputToIso(value: string): string {
    // A date-time string without a zone is parsed as local time by Date.
    return new Date(value).toISOString();
}

/** Converts the live-class fields of any lesson payload before it is sent. */
export function withLiveInstants<T extends object>(form: T): T {
    const { liveStartsAt, liveEndsAt } = form as { liveStartsAt?: string; liveEndsAt?: string };
    return {
        ...form,
        ...(liveStartsAt ? { liveStartsAt: localInputToIso(liveStartsAt) } : {}),
        ...(liveEndsAt ? { liveEndsAt: localInputToIso(liveEndsAt) } : {}),
    };
}
