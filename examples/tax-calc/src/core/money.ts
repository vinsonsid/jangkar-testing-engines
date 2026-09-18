export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Round half-up to the nearest whole rupiah. */
export function roundRupiah(n: number): number {
  return Math.floor(n + 0.5);
}
