export const itemDisplayName = (
  productName: string,
  variantName?: string | null
): string =>
  variantName ? `${productName} (${variantName})` : productName;

/**
 * Returns the human-readable quantity label for a bundle/unit product sale.
 * e.g. (3, 5, "BUNDLE(S)", "kg") → "3 bundles, 5 kg"
 *      (0, 48, "BAG(S)", "pound-weight") → "48 pound-weight"
 *      (2, 0, "BUNDLE(S)", "length") → "2 bundles"
 * mainUnit and subUnit default to "bundle" / "kg" if omitted.
 */
export const formatBundleQty = (
  bundlesQty?: number | null,
  kgQty?: number | null,
  mainUnit?: string | null,
  subUnit?: string | null
): string => {
  const parts: string[] = [];
  const largeBase = mainUnit
    ? mainUnit.replace(/\(s\)$/i, "").trim().toLowerCase()
    : "bundle";
  const smallUnit = subUnit || "kg";
  if (bundlesQty) parts.push(`${bundlesQty} ${largeBase}${bundlesQty !== 1 ? "s" : ""}`);
  if (kgQty) parts.push(`${kgQty} ${smallUnit}`);
  return parts.join(", ");
};

/**
 * Returns true if this item used bundle/kg entry (i.e. is a bundle product sale).
 */
export const isBundleItem = (
  bundlesQty?: number | null,
  kgQty?: number | null
): boolean => bundlesQty != null || kgQty != null;

/**
 * Returns true if this item was sold as a pure sub-unit (e.g. 12kg cut from a bundle).
 * Identified by kgQty being set without a bundlesQty — treated as qty=1.
 */
export const isSubUnitItem = (
  bundlesQty?: number | null,
  kgQty?: number | null
): boolean => (kgQty ?? 0) > 0 && !bundlesQty;

/**
 * Returns the display name for a sub-unit item, e.g. "12kg Binding Wire"
 */
export const subUnitDisplayName = (
  kgQty?: number | null,
  subUnit?: string | null,
  productName?: string,
  variantName?: string | null
): string => {
  const base = itemDisplayName(productName ?? "", variantName);
  return `${kgQty ?? ""}${subUnit ?? "kg"} ${base}`.trim();
};
