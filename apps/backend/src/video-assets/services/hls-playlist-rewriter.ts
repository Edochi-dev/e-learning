const KEY_URI_PATTERN = /(#EXT-X-KEY:[^\n]*URI=")[^"]*(")/g;

/** URI lines are the non-empty lines that are not tags or comments. */
function mapUriLines(playlist: string, map: (uri: string) => string): string {
  return playlist
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') ? map(trimmed) : line;
    })
    .join('\n');
}

/**
 * Variant URIs stay relative, so they resolve against the API URL the master
 * was fetched from, whatever prefix the reverse proxy adds (/api in prod).
 */
export function rewriteMasterPlaylist(playlist: string, token: string): string {
  const query = `token=${encodeURIComponent(token)}`;
  return mapUriLines(playlist, (uri) => `${uri}?${query}`);
}

export interface VariantRewrite {
  keyUri: string;
  segmentUrl: (segment: string) => string;
}

export function rewriteVariantPlaylist(
  playlist: string,
  rewrite: VariantRewrite,
): string {
  return mapUriLines(
    playlist.replace(KEY_URI_PATTERN, `$1${rewrite.keyUri}$2`),
    rewrite.segmentUrl,
  );
}
