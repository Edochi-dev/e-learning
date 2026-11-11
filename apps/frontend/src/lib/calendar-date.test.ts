import { describe, it, expect } from 'vitest';
import { todayCalendarDate } from './calendar-date';

describe('todayCalendarDate', () => {
  it('usa el día local aunque en UTC ya sea mañana', () => {
    // 23:59 local time: the UTC date may already be the next day.
    expect(todayCalendarDate(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });

  it('rellena mes y día con ceros', () => {
    expect(todayCalendarDate(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});
