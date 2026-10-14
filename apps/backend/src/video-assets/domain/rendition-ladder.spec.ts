import { selectRenditions } from './rendition-ladder';

const names = (height: number) => selectRenditions(height).map((r) => r.name);

describe('selectRenditions', () => {
  it('offers every rung for a 1080p or larger source', () => {
    expect(names(1080)).toEqual(['1080p', '720p', '480p']);
    expect(names(2160)).toEqual(['1080p', '720p', '480p']);
  });

  it('never upscales', () => {
    expect(names(720)).toEqual(['720p', '480p']);
    expect(names(1000)).toEqual(['720p', '480p']);
  });

  it('still offers the lowest rung for a source below it', () => {
    expect(names(360)).toEqual(['480p']);
  });
});
