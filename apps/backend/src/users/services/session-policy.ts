export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Sliding: every refresh pushes the expiry this far forward again. */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Two tabs refreshing at the same moment both send the same token; the loser
 * arrives with a token that was just rotated. Within this window that is a
 * race, not a copied token, and must not revoke the session.
 */
export const ROTATION_GRACE_SECONDS = 30;
