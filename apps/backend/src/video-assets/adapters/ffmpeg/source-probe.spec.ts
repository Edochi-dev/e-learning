import { parseFfprobeOutput } from './source-probe';

const probe = (streams: object[], duration: string | null = '125.4') =>
  JSON.stringify({ streams, format: { duration } });

describe('parseFfprobeOutput', () => {
  it('reads duration, dimensions and audio presence', () => {
    expect(
      parseFfprobeOutput(
        probe([
          { codec_type: 'video', width: 1920, height: 1080 },
          { codec_type: 'audio' },
        ]),
      ),
    ).toEqual({
      durationSeconds: 125,
      width: 1920,
      height: 1080,
      hasAudio: true,
    });
  });

  it('swaps dimensions for portrait phone video stored with a rotation flag', () => {
    const info = parseFfprobeOutput(
      probe([
        {
          codec_type: 'video',
          width: 1920,
          height: 1080,
          side_data_list: [{ rotation: -90 }],
        },
      ]),
    );
    expect(info).toMatchObject({ width: 1080, height: 1920, hasAudio: false });
  });

  it('honours the legacy rotate tag', () => {
    const info = parseFfprobeOutput(
      probe([
        {
          codec_type: 'video',
          width: 1280,
          height: 720,
          tags: { rotate: '270' },
        },
      ]),
    );
    expect(info.height).toBe(1280);
  });

  it('rejects a file without a video stream', () => {
    expect(() => parseFfprobeOutput(probe([{ codec_type: 'audio' }]))).toThrow(
      'pista de video',
    );
  });

  it('rejects a file without a duration', () => {
    expect(() =>
      parseFfprobeOutput(
        probe([{ codec_type: 'video', width: 10, height: 10 }], null),
      ),
    ).toThrow('duración');
  });
});
