function currencyPreferenceKey(accountId: string, tripId: string) {
  return `travel-ledger:v1:last-currency:${accountId}:${tripId}`;
}

export function readCurrencyPreference(accountId: string, tripId: string): string | null {
  try {
    const value = localStorage.getItem(currencyPreferenceKey(accountId, tripId));

    return value && /^[A-Z]{3}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveCurrencyPreference(accountId: string, tripId: string, currency: string) {
  try {
    localStorage.setItem(currencyPreferenceKey(accountId, tripId), currency);
  } catch {
    /* Storage restrictions must not prevent recording expenses. */
  }
}
