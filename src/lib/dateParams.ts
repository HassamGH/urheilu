function pad(value: number) {
  return String(value).padStart(2, '0');
}

// The API's `date` filter is only confirmed to accept YYYY-MM-DD, compared against the viewer's
// own calendar day since there's no way to pass it a timezone.
export function dateParam(offsetDays = 0): string {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
