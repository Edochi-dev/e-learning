import { VideoProvider } from '@maris-nails/shared';
import { videoProviderOf, youtubeEmbedUrl } from './video-provider';

const EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('videoProviderOf', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  ])('reconoce YouTube: %s', (url) =>
    expect(videoProviderOf(url)).toBe(VideoProvider.YOUTUBE),
  );

  it.each([
    '/static/videos/clase1.mp4',
    'http://localhost:3000/static/videos/clase1.mp4',
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
  ])('lo demás es video propio: %s', (url) =>
    expect(videoProviderOf(url)).toBe(VideoProvider.HOSTED),
  );
});

describe('youtubeEmbedUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
  ])('convierte %s en un enlace que carga en un iframe', (url) =>
    expect(youtubeEmbedUrl(url)).toBe(EMBED),
  );

  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>',
    '/static/videos/clase1.mp4',
    'no es una url',
  ])('devuelve null si no hay un video reconocible: %s', (url) =>
    expect(youtubeEmbedUrl(url)).toBeNull(),
  );
});
