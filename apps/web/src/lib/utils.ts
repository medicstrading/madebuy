export function formatCurrency(
  amount: number | undefined,
  currency: string = 'AUD',
): string {
  if (amount === undefined || amount === null) {
    return 'Price not set'
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}
