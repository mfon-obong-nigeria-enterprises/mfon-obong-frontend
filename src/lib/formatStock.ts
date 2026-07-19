/**
 * Formats a stock number as a human-readable mixed-unit string.
 *
 * For bundle products (e.g. bundleSize=20, unit="bundle", subUnit="kg"):
 *   99.5  → "99 bundle(s) 10kg"
 *   100   → "100 bundle(s)"
 *
 * For regular products:
 *   10, "bag" → "10 bag"
 */
export function formatStock(
  stock: number,
  unit: string,
  isBundleProduct?: boolean,
  bundleSize?: number,
  subUnit?: string
): string {
  if (isBundleProduct && bundleSize && bundleSize > 0 && subUnit) {
    const whole = Math.floor(stock);
    const remainder = Math.round((stock - whole) * bundleSize);
    if (remainder > 0) {
      return `${whole} ${unit} ${remainder}${subUnit}`;
    }
    return `${whole} ${unit}`;
  }
  return `${stock} ${unit}`;
}
