// `new Date('YYYY-MM-DD')` parses as UTC midnight, which renders as the previous
// day in the Americas. Calendar dates must be built from their parts instead.
export function parseCalendarDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// The admin's local day, not UTC: in the evening UTC is already tomorrow.
export function todayCalendarDate(now: Date = new Date()): string {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
