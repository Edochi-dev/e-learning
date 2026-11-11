import { VideoProvider } from '@maris-nails/shared';

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
];
const YOUTUBE_ID = /^[\w-]{11}$/;

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function videoProviderOf(url: string): VideoProvider {
  const parsed = parse(url);
  return parsed && YOUTUBE_HOSTS.includes(parsed.hostname)
    ? VideoProvider.YOUTUBE
    : VideoProvider.HOSTED;
}

/**
 * The embeddable form of any YouTube link the teacher may paste (watch,
 * youtu.be, shorts or embed); null if it is not a recognizable video link.
 * A plain watch?v= URL refuses to load inside an iframe.
 */
export function youtubeEmbedUrl(url: string): string | null {
  const parsed = parse(url);
  if (!parsed || !YOUTUBE_HOSTS.includes(parsed.hostname)) return null;

  const id =
    parsed.hostname === 'youtu.be'
      ? parsed.pathname.slice(1)
      : (parsed.searchParams.get('v') ??
        parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);

  return id && YOUTUBE_ID.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : null;
}
