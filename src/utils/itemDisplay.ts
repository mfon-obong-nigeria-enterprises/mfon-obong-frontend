/**
 * Returns the display name for a transaction item.
 * For multi-grade products, appends the grade in parentheses:
 *   e.g. "12MM ROD (SUP)" instead of just "12MM ROD"
 */
export const itemDisplayName = (
  productName: string,
  variantName?: string | null
): string =>
  variantName ? `${productName} (${variantName})` : productName;
