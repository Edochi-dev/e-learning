import { outputDimensions, selectRenditions } from './rendition-ladder';
import { RENDITION_LADDER } from './rendition-ladder';

const names = (width: number, height: number) =>
  selectRenditions({ width, height }).map((r) => r.name);

const [r1080, r720, r480] = RENDITION_LADDER;

describe('selectRenditions', () => {
  it('offers every rung for a 1080p or larger source', () => {
    expect(names(1920, 1080)).toEqual(['1080p', '720p', '480p']);
    expect(names(3840, 2160)).toEqual(['1080p', '720p', '480p']);
  });

  it('never upscales', () => {
    expect(names(1280, 720)).toEqual(['720p', '480p']);
    expect(names(1778, 1000)).toEqual(['720p', '480p']);
  });

  it('measures portrait video by its short side', () => {
    expect(names(1080, 1920)).toEqual(['1080p', '720p', '480p']);
    expect(names(720, 1280)).toEqual(['720p', '480p']);
  });

  it('still offers the lowest rung for a source below it', () => {
    expect(names(640, 360)).toEqual(['480p']);
  });
});

describe('outputDimensions', () => {
  it('scales landscape video to the rung height', () => {
    expect(outputDimensions(r720, { width: 1920, height: 1080 })).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('scales portrait video to the rung width, keeping it full resolution', () => {
    expect(outputDimensions(r1080, { width: 1080, height: 1920 })).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(outputDimensions(r480, { width: 1080, height: 1920 })).toEqual({
      width: 480,
      height: 854,
    });
  });

  it('rounds the long side to an even number for 4:2:0 H.264', () => {
    expect(outputDimensions(r480, { width: 1920, height: 1080 }).width).toBe(
      854,
    );
  });
});
