export const itemDisplayName = (
  productName: string,
  variantName?: string | null
): string =>
  variantName ? `${productName} (${variantName})` : productName;

/**
 * Returns the human-readable quantity label for a bundle product sale.
 * e.g. (3, 5) → "3 bundles, 5kg"  |  (0, 10) → "10kg"  |  (3, 0) → "3 bundles"
 */
export const formatBundleQty = (
  bundlesQty?: number | null,
  kgQty?: number | null
): string => {
  const parts: string[] = [];
  if (bundlesQty) parts.push(`${bundlesQty} bundle${bundlesQty !== 1 ? "s" : ""}`);
  if (kgQty) parts.push(`${kgQty}kg`);
  return parts.join(", ");
};

/**
 * Returns true if this item used bundle/kg entry (i.e. is a bundle product sale).
 */
export const isBundleItem = (
  bundlesQty?: number | null,
  kgQty?: number | null
): boolean => bundlesQty != null || kgQty != null;
