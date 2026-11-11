/**
 * "1 hora" while the reminder goes out on time; the real minutes left when it
 * goes out late (the class was scheduled less than an hour ahead, or the
 * server was down). Relative on purpose: students live in different time
 * zones, and a clock time would be wrong for some of them.
 */
export function startsInText(startsAt: Date, now: Date): string {
  const minutes = Math.max(
    1,
    Math.round((startsAt.getTime() - now.getTime()) / 60_000),
  );
  if (minutes >= 55) return '1 hora';
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}
