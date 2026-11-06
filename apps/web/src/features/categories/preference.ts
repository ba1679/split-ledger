export function categoryPreferenceKey(accountId: string) {
  return `travel-ledger:last-category:${accountId}`;
}

export function readCategoryPreference(accountId: string): string | null {
  try {
    return localStorage.getItem(categoryPreferenceKey(accountId));
  } catch {
    return null;
  }
}

export function saveCategoryPreference(accountId: string, categoryId: string) {
  try {
    if (categoryId) localStorage.setItem(categoryPreferenceKey(accountId), categoryId);
    else localStorage.removeItem(categoryPreferenceKey(accountId));
  } catch {
    /* Storage restrictions must not prevent recording expenses. */
  }
}
