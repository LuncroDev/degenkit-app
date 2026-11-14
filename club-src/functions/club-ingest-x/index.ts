// DegenKit Club: reads new posts of tracked X accounts through an Apify actor and stores contract-address calls.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ACTOR = "apisamurai~x-twitter-scraper";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SKIP = new Set([
  "So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "11111111111111111111111111111111", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "0x0000000000000000000000000000000000000000", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "0xdac17f958d2ee523a2206206994597c13d831ec7", "0x4200000000000000000000000000000000000006", "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
]);
function b58len(s: string): number {
  let n = 0n;
  for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) return -1; n = n * 58n + BigInt(i); }
  let bytes = 0; while (n > 0n) { n >>= 8n; bytes++; }
  for (const ch of s) { if (ch === "1") bytes++; else break; }
  return bytes;
}
function extractAddrs(text: string): { chain: string; address: string }[] {
  const out = new Map<string, { chain: string; address: string }>();
  for (const m of text.matchAll(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g)) {
    const a = m[0].toLowerCase(); if (!SKIP.has(a)) out.set(a, { chain: "evm", address: a });
  }
  for (const m of text.matchAll(/(?<![A-Za-z0-9_-])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9_-])/g)) {
    const a = m[0];
    if (SKIP.has(a) || !/[0-9]/.test(a) || !/[a-z]/.test(a) || !/[A-Z]/.test(a)) continue;
    if (b58len(a) !== 32) continue;
    out.set(a, { chain: "solana", address: a });
  }
  return [...out.values()];
}
async function cfgGet(key: string): Promise<string | null> {
  const { data } = await sb.from("club_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
async function cfgSet(key: string, value: string) {
  const { error } = await sb.from("club_config").upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
// Groups handles into search queries that stay under X's query length limit.
function buildQueries(handles: string[], since: number): string[] {
  const tail = ` since_time:${since} -filter:replies -filter:nativeretweets`;
  const out: string[] = []; let cur: string[] = [];
  const len = (hs: string[]) => hs.reduce((a, h) => a + h.length + 9, 2) + tail.length;
  for (const h of handles) {
    if (cur.length && len([...cur, h]) > 480) { out.push(`(${cur.map((x) => "from:" + x).join(" OR ")})${tail}`); cur = []; }
    cur.push(h);
  }
  if (cur.length) out.push(`(${cur.map((x) => "from:" + x).join(" OR ")})${tail}`);
  return out;
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  if (req.headers.get("x-club-key") !== (await cfgGet("cron_key"))) return new Response("forbidden", { status: 403 });
  const stats: Record<string, unknown> = { sources: 0, queries: 0, tweets: 0, calls: 0, repeats: 0, recaps: 0 };
  const log = async (ok: boolean, error?: string) => { await sb.from("club_runs").insert({ fn: "ingest-x", ms: Date.now() - t0, ok, stats, error: error ?? null }); };
  try {
    const token = Deno.env.get("APIFY_TOKEN");
    if (!token) throw new Error("APIFY_TOKEN secret is missing");
    const now = Math.floor(Date.now() / 1000);
    // One run at a time: a slow run must not overlap the next minute's run.
    const lock = +(await cfgGet("x_lock") ?? 0);
    if (now - lock < 55) return Response.json({ ok: true, skipped: "locked" });
    // Daily spend cap, counted in tweets returned (the actor bills per tweet).
    const day = new Date().toISOString().slice(0, 10);
    const cap = +(await cfgGet("x_daily_cap") ?? 3000);
    let usage = { day, tweets: 0 };
    try { const u = JSON.parse(await cfgGet("x_usage") ?? "{}"); if (u.day === day) usage = u; } catch { /* fresh day */ }
    stats.used_today = usage.tweets; stats.cap = cap;
    if (usage.tweets >= cap) { stats.skipped = "daily cap reached"; await log(true); return Response.json({ ok: true, ...stats }); }

    const { data: sources, error } = await sb.from("club_sources").select("id,handle").eq("platform", "x").eq("active", true).order("id");
    if (error) throw error;
    if (!sources?.length) { await log(true); return Response.json({ ok: true, ...stats }); }
    stats.sources = sources.length;
    const byHandle = new Map(sources.map((s) => [s.handle.toLowerCase(), s.id]));

    const cursor = +(await cfgGet("x_cursor") ?? 0);
    const first = !cursor;
    // 15 s overlap for search-index lag; after a long pause do not reach back more than 6 h.
    const since = first ? now - 12 * 3600 : Math.max(cursor - 15, now - 6 * 3600);
    const queries = buildQueries(sources.map((s) => s.handle), since);
    stats.queries = queries.length; stats.since = since;
    await cfgSet("x_lock", String(now));

    const auth = { authorization: `Bearer ${token}` };
    const maxItems = Math.max(1, Math.min(cap - usage.tweets, first ? 400 : 200));
    const r = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?waitForFinish=45`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ searchTerms: queries, maxItems }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`apify ${r.status}: ${JSON.stringify(j?.error ?? j).slice(0, 200)}`);
    const run = j.data;
    stats.run_id = run?.id; stats.run_status = run?.status; stats.run_secs = run?.stats?.runTimeSecs;
    if (run?.status !== "SUCCEEDED") throw new Error(`apify run ${run?.status}`);
    const d = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&limit=1000`, { headers: auth });
    const items = (await d.json()) as Record<string, any>[];
    if (!Array.isArray(items)) throw new Error("apify dataset not readable");
    stats.tweets = items.length;

    const batch = [];
    let recaps = 0, unknown = 0;
    for (const it of items) {
      if (it.type && it.type !== "tweet") continue;
      if (it.isReply || it.isRetweet) continue;
      const user = String(it.author?.username ?? "").toLowerCase();
      const sid = byHandle.get(user);
      if (!sid || !it.id || !it.createdAt) { unknown++; continue; }
      const text = String(it.text ?? "");
      const scan = `${text} ${JSON.stringify(it.urls ?? "")} ${String(it.quotedTweet?.text ?? "")} ${JSON.stringify(it.quotedTweet?.urls ?? "")}`;
      const addrs = extractAddrs(scan);
      if (!addrs.length) continue;
      if (addrs.length > 3) { recaps++; continue; }
      batch.push({ source_id: sid, post_id: String(it.id), post_url: it.url ?? `https://x.com/${it.author.username}/status/${it.id}`, posted_at: new Date(it.createdAt).toISOString(), excerpt: text.slice(0, 400), addrs });
    }
    stats.recaps = recaps; stats.unknown = unknown; stats.with_address = batch.length;
    if (batch.length) {
      const { data, error: e2 } = await sb.rpc("club_ingest", { items: batch });
      if (e2) throw e2;
      stats.calls = data?.inserted ?? 0; stats.repeats = data?.repeats ?? 0;
    }
    usage.tweets += items.length;
    await cfgSet("x_usage", JSON.stringify(usage));
    await cfgSet("x_cursor", String(now));
    await sb.from("club_sources").update({ last_polled_at: new Date().toISOString(), last_error: null }).eq("platform", "x").eq("active", true);
    await cfgSet("x_lock", "0");
    await log(true);
    return Response.json({ ok: true, ms: Date.now() - t0, ...stats });
  } catch (e) {
    await cfgSet("x_lock", "0").catch(() => {});
    await log(false, String((e as Error).message).slice(0, 300));
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
});
