/** Myanmar shop display — whole kyats, grouped digits. */
export function formatMmk(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0);
  return `${n.toLocaleString("en-US")} Ks`;
}
