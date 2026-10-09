// `new Date('YYYY-MM-DD')` parses as UTC midnight, which renders as the previous
// day in the Americas. Calendar dates must be built from their parts instead.
export function parseCalendarDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}
