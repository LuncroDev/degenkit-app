// DegenKit Club: resolves called tokens, measures what the price did after each call and scores it.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { evaluate, type Candle } from "./metrics.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UA = { "user-agent": "DegenKitClub/1.0 (+https://degenkit.app)", accept: "application/json" };
const GT_NET: Record<string, string> = { solana: "solana", ethereum: "eth", bsc: "bsc", base: "base", arbitrum: "arbitrum", polygon: "polygon_pos", avalanche: "avax", optimism: "optimism" };
const H = 3600;
let gtCalls = 0, gtLimited = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Pair = { chainId: string; dexId: string; pairAddress: string; baseToken: { address: string; name: string; symbol: string }; priceUsd?: string; liquidity?: { usd?: number }; fdv?: number; marketCap?: number; volume?: { h24?: number }; pairCreatedAt?: number; info?: { imageUrl?: string } };
const same = (a: string, b: string) => a === b || a.toLowerCase() === b.toLowerCase();
const liq = (p: Pair) => p.liquidity?.usd ?? 0;

async function dexPairs(address: string): Promise<Pair[]> {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { headers: UA });
  if (!r.ok) throw new Error(`dexscreener ${r.status}`);
  const j = await r.json();
  return (j.pairs ?? []) as Pair[];
}
async function dexSearchPair(address: string): Promise<Pair | null> {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${address}`, { headers: UA });
  if (!r.ok) return null;
  const j = await r.json();
  return ((j.pairs ?? []) as Pair[]).find((p) => same(p.pairAddress, address)) ?? null;
}
function bestPair(pairs: Pair[], address: string): Pair | null {
  const mine = pairs.filter((p) => same(p.baseToken.address, address));
  if (!mine.length) return null;
  return mine.sort((a, b) => liq(b) - liq(a) || (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];
}

async function resolveTokens(stats: Record<string, number>) {
  const { data: toks } = await sb.from("club_tokens").select("id,chain,address,resolve_tries").eq("resolved", false).lt("resolve_tries", 5).order("id").limit(40);
  for (const t of toks ?? []) {
    try {
      let pairs = await dexPairs(t.address);
      let addr = t.address;
      let best = bestPair(pairs, addr);
      if (!best) {
        const asPair = await dexSearchPair(t.address);
        if (asPair) { addr = asPair.chainId === "solana" ? asPair.baseToken.address : asPair.baseToken.address.toLowerCase(); pairs = await dexPairs(addr); best = bestPair(pairs, addr) ?? asPair; }
      }
      if (!best) {
        const tries = t.resolve_tries + 1;
        await sb.from("club_tokens").update({ resolve_tries: tries }).eq("id", t.id);
        if (tries >= 5) await sb.from("club_calls").update({ status: "no_data", eval_error: "token not found on any DEX" }).eq("token_id", t.id).in("status", ["new", "tracking"]);
        stats.unresolved++; continue;
      }
      const { data: tid, error } = await sb.rpc("club_token_set", { p_id: t.id, p_chain: best.chainId, p_address: addr, p_symbol: best.baseToken.symbol?.slice(0, 40) ?? null, p_name: best.baseToken.name?.slice(0, 80) ?? null, p_image: best.info?.imageUrl ?? null });
      if (error) throw error;
      await sb.from("club_calls").update({ seen_price: best.priceUsd ? +best.priceUsd : null, seen_mcap: best.marketCap ?? best.fdv ?? null, seen_liq: best.liquidity?.usd ?? null, seen_at: new Date().toISOString(), pair_address: best.pairAddress, dex_id: best.dexId })
        .eq("token_id", tid).is("seen_at", null);
      stats.resolved++;
    } catch (e) { stats.errors++; console.error("resolve", t.address, (e as Error).message); }
    await sleep(120);
  }
}

async function gtCandles(net: string, pool: string, before: number, limit = 1000): Promise<Candle[] | null> {
  if (gtLimited || gtCalls >= 10) { gtLimited = true; return null; }
  gtCalls++;
  const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${pool}/ohlcv/minute?aggregate=1&limit=${limit}&before_timestamp=${before}&currency=usd`, { headers: UA });
  if (r.status === 429) { gtLimited = true; return null; }
  if (r.status === 404) return [];
  if (r.status === 401) throw new Error("history_unavailable");
  if (!r.ok) throw new Error(`geckoterminal ${r.status}`);
  const j = await r.json();
  await sleep(1100);
  return (j?.data?.attributes?.ohlcv_list ?? []) as Candle[];
}
// Candles for one pool covering [t0 - a little, end]. Returns null when rate limited.
async function poolSeries(net: string, pool: string, t0: number, end: number): Promise<Candle[] | null> {
  let all: Candle[] = [];
  let before = end + 60;
  for (let i = 0; i < 3; i++) {
    const c = await gtCandles(net, pool, before);
    if (c === null) return null;
    all = all.concat(c);
    if (c.length < 1000) break;
    const earliest = Math.min(...c.map((x) => x[0]));
    if (earliest <= t0) break;
    before = earliest;
  }
  const callMin = Math.floor(t0 / 60) * 60;
  if (all.length && !all.some((c) => c[0] <= callMin)) {
    const prev = await gtCandles(net, pool, callMin + 60, 1);
    if (prev === null) return null;
    all = all.concat(prev);
  }
  return all;
}

async function evaluateCalls(stats: Record<string, number>, t0run: number) {
  const nowIso = new Date().toISOString();
  const { data: calls } = await sb.from("club_calls")
    .select("id,posted_at,eval_tries,token:club_tokens!inner(id,chain,address,resolved)")
    .in("status", ["new", "tracking"]).lte("next_eval_at", nowIso).eq("token.resolved", true).order("next_eval_at").order("posted_at", { ascending: false }).limit(30);
  for (const c of calls ?? []) {
    if (gtLimited || Date.now() - t0run > 42000) break;
    const tok = c.token as unknown as { id: number; chain: string; address: string };
    const t0 = Math.floor(new Date(c.posted_at).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    if (now - t0 < 180) { await sb.from("club_calls").update({ next_eval_at: new Date((t0 + 185) * 1000).toISOString() }).eq("id", c.id); continue; }
    const end = Math.min(now, t0 + 24 * H);
    const net = GT_NET[tok.chain] ?? tok.chain;
    try {
      const pairs = (await dexPairs(tok.address)).filter((p) => same(p.baseToken.address, tok.address) && p.chainId === tok.chain).sort((a, b) => liq(b) - liq(a));
      if (!pairs.length) throw new Error("no pairs");
      // Main pool by liquidity, plus the pool that already existed at call time if the main one was created later (pump.fun graduation, migrations).
      const pools = [pairs[0]];
      if ((pairs[0].pairCreatedAt ?? 0) > t0 * 1000) {
        const older = pairs.filter((p) => p.pairCreatedAt && p.pairCreatedAt <= t0 * 1000).sort((a, b) => (a.pairCreatedAt ?? 0) - (b.pairCreatedAt ?? 0))[0]
          ?? pairs.slice(1).sort((a, b) => (a.pairCreatedAt ?? 0) - (b.pairCreatedAt ?? 0))[0];
        if (older) pools.push(older);
      }
      let candles: Candle[] = [], limited = false;
      for (const p of pools) {
        const s = await poolSeries(net, p.pairAddress, t0, end);
        if (s === null) { limited = true; break; }
        // When two pools overlap, prefer the one listed first (deeper liquidity) for a given minute.
        const have = new Set(candles.map((x) => x[0]));
        candles = candles.concat(s.filter((x) => !have.has(x[0])));
      }
      if (limited) break;
      const res = evaluate(t0, now, candles);
      if (!res.ok) {
        const tries = c.eval_tries + 1;
        const giveUp = tries >= 4 || now - t0 > 30 * H;
        await sb.from("club_calls").update({ eval_tries: tries, eval_error: res.reason, status: giveUp ? "no_data" : "tracking", next_eval_at: giveUp ? null : new Date(Date.now() + 20 * 60000).toISOString(), pair_address: pairs[0].pairAddress, dex_id: pairs[0].dexId }).eq("id", c.id);
        stats.no_data++; continue;
      }
      const stageAt = [t0 + H + 120, t0 + 6 * H + 120, t0 + 24 * H + 120];
      const nextAt = res.final ? null : new Date(Math.max(stageAt[res.stage!] * 1000, Date.now() + 60000)).toISOString();
      await sb.from("club_calls").update({
        status: res.final ? "final" : "tracking", eval_stage: res.stage, next_eval_at: nextAt, evaluated_at: nowIso, eval_error: null,
        pair_address: pairs[0].pairAddress, dex_id: pairs[0].dexId,
        entry_price: res.entry_price, entry_at: new Date(res.entry_at! * 1000).toISOString(),
        last_price: res.last_price, last_price_at: new Date(res.last_at! * 1000).toISOString(),
        peak_price: res.peak_price, peak_at: new Date(res.peak_at! * 1000).toISOString(), low_price: res.low_price,
        x_peak: res.x_peak, x_1h: res.x_1h, x_6h: res.x_6h, x_24h: res.x_24h, x_now: res.x_now,
        secs_to_peak: res.secs_to_peak, secs_above: res.secs_above, pct_time_above: res.pct_time_above, max_drawdown: res.max_drawdown,
        dumped_fast: res.dumped_fast, blend_x: res.blend_x, outcome: res.outcome, points: res.points,
      }).eq("id", c.id);
      stats.evaluated++; if (res.final) stats.finalized++;
    } catch (e) {
      const msg = String((e as Error).message).slice(0, 200);
      const tries = c.eval_tries + 1;
      const dead = tries >= 6 || msg === "history_unavailable";
      await sb.from("club_calls").update({ eval_tries: tries, eval_error: msg, status: dead ? "no_data" : "tracking", next_eval_at: dead ? null : new Date(Date.now() + 15 * 60000).toISOString() }).eq("id", c.id);
      stats.errors++;
    }
  }
}

async function livePrices(stats: Record<string, number>) {
  const since = new Date(Date.now() - 24 * H * 1000).toISOString();
  const { data } = await sb.from("club_calls").select("token:club_tokens!inner(id,chain,address)").in("status", ["new", "tracking"]).gte("posted_at", since).not("entry_price", "is", null).limit(300);
  const byChain = new Map<string, Map<string, number>>();
  for (const r of data ?? []) { const t = r.token as unknown as { id: number; chain: string; address: string }; if (!byChain.has(t.chain)) byChain.set(t.chain, new Map()); byChain.get(t.chain)!.set(t.address, t.id); }
  const rows: { token_id: number; price: number }[] = [];
  for (const [chain, m] of byChain) {
    const addrs = [...m.keys()];
    for (let i = 0; i < addrs.length; i += 30) {
      const r = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${addrs.slice(i, i + 30).join(",")}`, { headers: UA });
      if (!r.ok) continue;
      const pairs = (await r.json()) as Pair[];
      for (const a of addrs.slice(i, i + 30)) { const b = bestPair(pairs, a); if (b?.priceUsd) rows.push({ token_id: m.get(a)!, price: +b.priceUsd }); }
    }
  }
  if (rows.length) { const { data: n } = await sb.rpc("club_live_prices", { rows }); stats.live = n ?? 0; }
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  gtCalls = 0; gtLimited = false;
  const { data: cfg } = await sb.from("club_config").select("value").eq("key", "cron_key").single();
  if (!cfg || req.headers.get("x-club-key") !== cfg.value) return new Response("forbidden", { status: 403 });
  const stats: Record<string, number> = { resolved: 0, unresolved: 0, evaluated: 0, finalized: 0, no_data: 0, live: 0, errors: 0 };
  try {
    await resolveTokens(stats);
    await evaluateCalls(stats, t0);
    await livePrices(stats);
    await sb.rpc("club_refresh_stats");
    stats.gt_calls = gtCalls; stats.gt_limited = gtLimited ? 1 : 0;
    await sb.from("club_runs").insert({ fn: "track", ms: Date.now() - t0, ok: true, stats });
    return Response.json({ ok: true, ms: Date.now() - t0, ...stats });
  } catch (e) {
    await sb.from("club_runs").insert({ fn: "track", ms: Date.now() - t0, ok: false, error: String((e as Error).message), stats });
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
});
