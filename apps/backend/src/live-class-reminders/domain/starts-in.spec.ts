import { startsInText } from './starts-in';

describe('startsInText', () => {
  const startsAt = new Date('2030-03-01T22:00:00Z');
  const before = (minutes: number) =>
    new Date(startsAt.getTime() - minutes * 60_000);

  it.each([
    [60, '1 hora'],
    [56, '1 hora'],
    [40, '40 minutos'],
    [1, '1 minuto'],
    [0.2, '1 minuto'],
  ])('%d minutos antes → "%s"', (minutes, text) => {
    expect(startsInText(startsAt, before(minutes))).toBe(text);
  });
});
