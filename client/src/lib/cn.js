/** Tiny class name joiner: falsy values are skipped. */
export function cn(...values) {
  return values.filter(Boolean).join(" ");
}
