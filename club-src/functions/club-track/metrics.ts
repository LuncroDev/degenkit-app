// Pure scoring maths for a call. Candles: [ts, open, high, low, close, volume], one-minute, any order.
export type Candle = [number, number, number, number, number, number];
export type Result = {
  ok: boolean; reason?: string;
  entry_price?: number; entry_at?: number; last_price?: number; last_at?: number;
  peak_price?: number; peak_at?: number; low_price?: number;
  x_peak?: number; x_1h?: number | null; x_6h?: number | null; x_24h?: number | null; x_now?: number;
  secs_to_peak?: number; secs_above?: number; pct_time_above?: number; max_drawdown?: number;
  dumped_fast?: boolean; blend_x?: number; outcome?: string; points?: number; stage?: number; final?: boolean;
};
const H = 3600;

export function evaluate(t0: number, now: number, raw: Candle[]): Result {
  const cs = raw.filter((c) => c && c[4] > 0).sort((a, b) => a[0] - b[0]).filter((c, i, a) => i === 0 || c[0] !== a[i - 1][0]);
  if (!cs.length) return { ok: false, reason: "no candles" };
  const callMin = Math.floor(t0 / 60) * 60;
  const end = Math.min(now, t0 + 24 * H);
  // Entry: close of the minute the call was posted in (or the last trade before it). If the token had not traded yet, the first trade after the call.
  let ei = -1;
  for (let i = 0; i < cs.length; i++) { if (cs[i][0] <= callMin) ei = i; else break; }
  let entry: number, entryAt: number, startIdx: number;
  if (ei >= 0) { entry = cs[ei][4]; entryAt = Math.max(t0, cs[ei][0]); startIdx = ei + 1; }
  else {
    const f = cs[0];
    if (f[0] - t0 > 6 * H) return { ok: false, reason: "no trades within 6h of the call" };
    entry = f[1]; entryAt = f[0]; startIdx = 0;
  }
  const post = cs.slice(startIdx).filter((c) => c[0] <= end);
  let peak = entry, peakAt = entryAt, low = entry, lowFirstHour = entry;
  let secsAbove = 0, lastPrice = entry, lastTs = entryAt;
  const at = (h: number): number | null => {
    const lim = entryAt + h * H; if (end < lim) return null;
    let p = entry; for (const c of post) { if (c[0] <= lim) p = c[4]; else break; }
    return p / entry;
  };
  for (const c of post) {
    if (lastPrice > entry) secsAbove += Math.max(0, c[0] - lastTs);
    lastPrice = c[4]; lastTs = Math.max(c[0], lastTs);
    if (c[4] > peak) { peak = c[4]; peakAt = c[0]; }
    if (c[4] < low) low = c[4];
    if (c[0] <= entryAt + H && c[4] < lowFirstHour) lowFirstHour = c[4];
  }
  if (lastPrice > entry) secsAbove += Math.max(0, end - lastTs);
  const elapsed = Math.max(1, end - entryAt);
  const x1 = at(1), x6 = at(6), x24 = at(24), xNow = lastPrice / entry;
  // Blend of fixed-horizon returns (a wick cannot game it). Before 1h has passed, use the current return.
  const parts: [number, number][] = [];
  if (x1 != null) parts.push([0.5, x1]); if (x6 != null) parts.push([0.3, x6]); if (x24 != null) parts.push([0.2, x24]);
  if (!parts.length) parts.push([1, xNow]);
  const wsum = parts.reduce((a, p) => a + p[0], 0);
  const blend = Math.exp(parts.reduce((a, p) => a + (p[0] / wsum) * Math.log(Math.max(p[1], 1e-6)), 0));
  const hold = Math.min(1, secsAbove / elapsed);
  const dumpedFast = lowFirstHour <= entry * 0.5;
  const xPeak = peak / entry;
  const base = 10 * Math.tanh(Math.log(blend));
  let points = base > 0 ? base * (0.4 + 0.6 * hold) : base - (dumpedFast ? 2 : 0);
  if (xPeak >= 3 && hold >= 0.5) points += 1;
  points = Math.max(-10, Math.min(10, points));
  const finalX = x24 ?? xNow;
  let outcome = "flat";
  if (finalX <= 0.1) outcome = "rug";
  else if (dumpedFast || blend <= 0.6) outcome = "dump";
  else if (xPeak >= 5 && hold >= 0.5) outcome = "moon";
  else if (blend >= 1.2 && hold >= 0.4) outcome = "win";
  const age = now - t0;
  const stage = age >= 24 * H ? 3 : age >= 6 * H ? 2 : age >= H ? 1 : 0;
  const r = (n: number, d = 4) => +n.toFixed(d);
  return {
    ok: true, entry_price: entry, entry_at: entryAt, last_price: lastPrice, last_at: lastTs, peak_price: peak, peak_at: peakAt, low_price: low,
    x_peak: r(xPeak), x_1h: x1 == null ? null : r(x1), x_6h: x6 == null ? null : r(x6), x_24h: x24 == null ? null : r(x24), x_now: r(xNow),
    secs_to_peak: Math.max(0, peakAt - t0), secs_above: Math.round(secsAbove), pct_time_above: r(hold), max_drawdown: r(low / entry - 1),
    dumped_fast: dumpedFast, blend_x: r(blend), outcome, points: r(points, 2), stage, final: stage === 3,
  };
}
