// DegenKit Club: reads public Telegram channel previews (t.me/s/<handle>) and stores contract-address calls.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UA = "Mozilla/5.0 (compatible; DegenKitClub/1.0; +https://degenkit.app)";
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
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, " ");
}
export function extractAddrs(text: string): { chain: string; address: string }[] {
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
type Post = { id: number; posted_at: string; text: string; scan: string };
function parsePage(html: string, handle: string): Post[] {
  const posts: Post[] = [];
  const parts = html.split('data-post="').slice(1);
  for (const part of parts) {
    const idm = part.match(/^([^"\/]+)\/(\d+)"/); if (!idm) continue;
    if (idm[1].toLowerCase() !== handle.toLowerCase()) continue;
    const tm = part.match(/tgme_widget_message_date"[^>]*>\s*<time[^>]*datetime="([^"]+)"/); if (!tm) continue;
    let body = "";
    const ti = part.search(/class="tgme_widget_message_text[^"]*js-message_text/);
    if (ti >= 0) {
      const start = part.indexOf(">", ti) + 1;
      const end = part.indexOf("</div>", start);
      body = part.slice(start, end > 0 ? end : start + 6000);
    }
    const hrefs = [...body.matchAll(/href="([^"]+)"/g)].map((m) => decodeEntities(m[1])).filter((u) => !/telesco\.pe|telegram\.org|cdn\d*\./.test(u));
    const text = decodeEntities(body.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").trim();
    posts.push({ id: +idm[2], posted_at: new Date(tm[1]).toISOString(), text, scan: text + " " + hrefs.join(" ") });
  }
  return posts.sort((a, b) => a.id - b.id);
}
async function fetchPage(handle: string, before?: number): Promise<Post[]> {
  const r = await fetch(`https://t.me/s/${handle}${before ? `?before=${before}` : ""}`, { headers: { "user-agent": UA, "accept-language": "en" } });
  if (!r.ok) throw new Error(`t.me ${r.status}`);
  return parsePage(await r.text(), handle);
}
async function pollSource(s: { id: number; handle: string; last_post_id: number | null }) {
  let posts = await fetchPage(s.handle);
  if (!posts.length) throw new Error("no posts (private, renamed or preview disabled)");
  const maxPages = s.last_post_id == null ? 2 : 4;
  for (let p = 0; p < maxPages; p++) {
    const min = posts[0].id;
    if (s.last_post_id != null && min <= s.last_post_id + 1) break;
    const older = await fetchPage(s.handle, min);
    if (!older.length) break;
    posts = [...older, ...posts];
  }
  const cutoff = Date.now() - 60 * 86400000;
  const fresh = posts.filter((p) => (s.last_post_id == null || p.id > s.last_post_id) && new Date(p.posted_at).getTime() > cutoff);
  const items = [];
  let skippedRecap = 0;
  for (const p of fresh) {
    const addrs = extractAddrs(p.scan);
    if (!addrs.length) continue;
    if (addrs.length > 3) { skippedRecap++; continue; }
    items.push({ source_id: s.id, post_id: String(p.id), post_url: `https://t.me/${s.handle}/${p.id}`, posted_at: p.posted_at, excerpt: p.text.slice(0, 400), addrs });
  }
  return { items, maxId: posts[posts.length - 1].id, fresh: fresh.length, skippedRecap };
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  const { data: cfg } = await sb.from("club_config").select("value").eq("key", "cron_key").single();
  if (!cfg || req.headers.get("x-club-key") !== cfg.value) return new Response("forbidden", { status: 403 });
  const stats: Record<string, unknown> = { sources: 0, posts: 0, calls: 0, repeats: 0, recaps: 0, errors: [] as string[] };
  try {
    const { data: sources, error } = await sb.from("club_sources").select("id,handle,last_post_id").eq("platform", "telegram").eq("active", true)
      .order("last_polled_at", { ascending: true, nullsFirst: true }).limit(40);
    if (error) throw error;
    const queue = [...(sources ?? [])];
    const worker = async () => {
      while (queue.length && Date.now() - t0 < 45000) {
        const s = queue.shift()!;
        try {
          const r = await pollSource(s);
          if (r.items.length) {
            const { data, error: e2 } = await sb.rpc("club_ingest", { items: r.items });
            if (e2) throw e2;
            stats.calls = (stats.calls as number) + (data?.inserted ?? 0); stats.repeats = (stats.repeats as number) + (data?.repeats ?? 0);
          }
          stats.posts = (stats.posts as number) + r.fresh; stats.recaps = (stats.recaps as number) + r.skippedRecap;
          await sb.from("club_sources").update({ last_post_id: r.maxId, last_polled_at: new Date().toISOString(), last_error: null }).eq("id", s.id);
        } catch (e) {
          (stats.errors as string[]).push(`${s.handle}: ${(e as Error).message}`);
          await sb.from("club_sources").update({ last_polled_at: new Date().toISOString(), last_error: String((e as Error).message).slice(0, 300) }).eq("id", s.id);
        }
        stats.sources = (stats.sources as number) + 1;
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
    await sb.from("club_runs").insert({ fn: "ingest-tg", ms: Date.now() - t0, ok: true, stats });
    return Response.json({ ok: true, ms: Date.now() - t0, ...stats });
  } catch (e) {
    await sb.from("club_runs").insert({ fn: "ingest-tg", ms: Date.now() - t0, ok: false, error: String((e as Error).message), stats });
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
});
