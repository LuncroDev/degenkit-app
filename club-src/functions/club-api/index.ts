// DegenKit Club API: wallet sign-in, on-chain payment check, members-only data.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "access-control-allow-methods": "POST, OPTIONS", "access-control-max-age": "86400" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const PUBLIC_RPCS = ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function b58decode(s: string): Uint8Array | null {
  let n = 0n;
  for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) return null; n = n * 58n + BigInt(i); }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
  for (const ch of s) { if (ch === "1") bytes.unshift(0); else break; }
  return new Uint8Array(bytes);
}
const isWallet = (s: unknown): s is string => typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) && b58decode(s)?.length === 32;
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const signInText = (wallet: string, nonce: string) => `DegenKit Club sign-in\n\nWallet: ${wallet}\nNonce: ${nonce}\n\nSigning proves you own this wallet. It does not move funds or approve anything.`;

async function config(): Promise<Record<string, string>> {
  const { data } = await sb.from("club_config").select("key,value");
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}
async function sessionWallet(req: Request): Promise<string | null> {
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return null;
  const { data } = await sb.from("club_sessions").select("wallet,expires_at").eq("token_hash", await sha256(m[1])).maybeSingle();
  return data && new Date(data.expires_at).getTime() > Date.now() ? data.wallet : null;
}
async function me(wallet: string, c: Record<string, string>) {
  const admin = (c.club_admin_wallets ?? "").split(",").map((s) => s.trim()).includes(wallet);
  const { data } = await sb.from("club_members").select("paid_until").eq("wallet", wallet).maybeSingle();
  const paid = data?.paid_until ?? null;
  return { wallet, admin, member: admin || (!!paid && new Date(paid).getTime() > Date.now()), paid_until: paid, price_usd: +(c.club_price_usd ?? 99), period_days: +(c.club_period_days ?? 30) };
}
async function solPrice(): Promise<number> {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${WSOL}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("price source unavailable");
  const pairs = ((await r.json()).pairs ?? []) as { chainId: string; baseToken: { address: string }; quoteToken: { symbol: string }; priceUsd?: string; liquidity?: { usd?: number } }[];
  const best = pairs.filter((p) => p.chainId === "solana" && p.baseToken.address === WSOL && /^USD[CT]$/.test(p.quoteToken.symbol) && p.priceUsd)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const p = best ? +best.priceUsd! : 0;
  if (!(p > 5 && p < 5000)) throw new Error("price source unavailable");
  return p;
}
async function rpc(c: Record<string, string>, method: string, params: unknown[]) {
  let last = "rpc unavailable";
  for (const url of [c.sol_rpc, ...PUBLIC_RPCS].filter(Boolean)) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      if (!r.ok) { last = `rpc ${r.status}`; continue; }
      const j = await r.json();
      if (j.error) { last = String(j.error.message ?? "rpc error"); continue; }
      return j.result;
    } catch (e) { last = String((e as Error).message); }
  }
  throw new Error(last);
}

async function verifyPayment(wallet: string, sig: string, c: Record<string, string>) {
  const treasury = c.club_treasury, price = +(c.club_price_usd ?? 99), days = +(c.club_period_days ?? 30);
  const { data: used } = await sb.from("club_payments").select("wallet").eq("tx_sig", sig).maybeSingle();
  if (used) return used.wallet === wallet ? { ok: true, me: await me(wallet, c) } : { ok: false, error: "This transaction was already used by another wallet." };
  // deno-lint-ignore no-explicit-any
  let tx: any = null;
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await rpc(c, "getTransaction", [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
    if (!tx) await sleep(1500);
  }
  if (!tx) return { ok: false, pending: true, error: "The transaction is not confirmed yet. Try again in a few seconds." };
  if (tx.meta?.err) return { ok: false, error: "This transaction failed on-chain." };
  const keys = (tx.transaction?.message?.accountKeys ?? []) as { pubkey: string; signer: boolean }[];
  if (!keys.some((k) => k.pubkey === wallet && k.signer)) return { ok: false, error: "This transaction was not signed by your wallet." };
  if (!tx.blockTime || Date.now() / 1000 - tx.blockTime > 2 * 3600) return { ok: false, error: "This transaction is older than 2 hours. Contact support with the signature." };
  const ti = keys.findIndex((k) => k.pubkey === treasury);
  const lamports = ti >= 0 ? (tx.meta.postBalances[ti] ?? 0) - (tx.meta.preBalances[ti] ?? 0) : 0;
  // deno-lint-ignore no-explicit-any
  const sum = (arr: any[]) => (arr ?? []).filter((b) => b.owner === treasury && b.mint === USDC).reduce((a, b) => a + BigInt(b.uiTokenAmount?.amount ?? "0"), 0n);
  const usdc = Number(sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances)) / 1e6;
  let asset = "", amount = 0, usd = 0;
  if (usdc >= price * 0.999) { asset = "USDC"; amount = usdc; usd = usdc; }
  else if (lamports > 0) {
    const sol = lamports / 1e9;
    const { data: quotes } = await sb.from("club_quotes").select("sol_amount,sol_price").eq("wallet", wallet).gte("created_at", new Date(Date.now() - 45 * 60000).toISOString());
    const q = (quotes ?? []).find((x) => sol >= +x.sol_amount * 0.999);
    if (q) { asset = "SOL"; amount = sol; usd = sol * +q.sol_price; }
    else {
      const p = await solPrice();
      if (sol * p >= price * 0.97) { asset = "SOL"; amount = sol; usd = sol * p; }
      else return { ok: false, error: `The payment is below the membership price (${sol} SOL received).` };
    }
  } else return { ok: false, error: "No payment to the club wallet was found in this transaction." };
  const { error: pe } = await sb.from("club_payments").insert({ wallet, tx_sig: sig, asset, amount, usd: Math.round(usd * 100) / 100, block_time: new Date(tx.blockTime * 1000).toISOString() });
  if (pe) return { ok: false, error: "This transaction was already recorded." };
  const { data: cur } = await sb.from("club_members").select("paid_until").eq("wallet", wallet).maybeSingle();
  const base = Math.max(Date.now(), cur?.paid_until ? new Date(cur.paid_until).getTime() : 0);
  const { error: me2 } = await sb.from("club_members").upsert({ wallet, paid_until: new Date(base + days * 86400000).toISOString() }, { onConflict: "wallet" });
  if (me2) throw me2;
  return { ok: true, me: await me(wallet, c) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const a = String(body.a ?? "");
    const c = await config();
    if (a === "public") {
      const { data, error } = await sb.rpc("club_api_public");
      if (error) throw error;
      return json({ ...data, treasury: c.club_treasury });
    }
    if (a === "nonce") {
      if (!isWallet(body.wallet)) return json({ error: "Invalid wallet address." }, 400);
      const nonce = crypto.randomUUID();
      const { error } = await sb.from("club_nonces").upsert({ wallet: body.wallet, nonce, created_at: new Date().toISOString() }, { onConflict: "wallet" });
      if (error) throw error;
      return json({ message: signInText(body.wallet, nonce) });
    }
    if (a === "login") {
      if (!isWallet(body.wallet) || typeof body.signature !== "string") return json({ error: "Invalid request." }, 400);
      const { data: n } = await sb.from("club_nonces").select("nonce,created_at").eq("wallet", body.wallet).maybeSingle();
      if (!n || Date.now() - new Date(n.created_at).getTime() > 10 * 60000) return json({ error: "Sign-in request expired. Try again." }, 400);
      let ok = false;
      try {
        const sig = Uint8Array.from(atob(body.signature), (ch) => ch.charCodeAt(0));
        const key = await crypto.subtle.importKey("raw", b58decode(body.wallet)!, { name: "Ed25519" }, false, ["verify"]);
        ok = sig.length === 64 && await crypto.subtle.verify("Ed25519", key, sig, new TextEncoder().encode(signInText(body.wallet, n.nonce)));
      } catch { ok = false; }
      if (!ok) return json({ error: "Signature check failed." }, 401);
      await sb.from("club_nonces").delete().eq("wallet", body.wallet);
      const token = hex(crypto.getRandomValues(new Uint8Array(32)));
      const { error } = await sb.from("club_sessions").insert({ token_hash: await sha256(token), wallet: body.wallet, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() });
      if (error) throw error;
      return json({ token, me: await me(body.wallet, c) });
    }

    const wallet = await sessionWallet(req);
    if (!wallet) return json({ error: "Sign in with your wallet first.", code: "auth" }, 401);
    if (a === "me") return json({ me: await me(wallet, c) });
    if (a === "logout") {
      const m = (req.headers.get("authorization") ?? "").match(/^Bearer ([a-f0-9]{64})$/);
      if (m) await sb.from("club_sessions").delete().eq("token_hash", await sha256(m[1]));
      return json({ ok: true });
    }
    if (a === "quote") {
      const price = +(c.club_price_usd ?? 99);
      const p = await solPrice();
      const sol = Math.ceil((price / p) * 10000) / 10000;
      await sb.from("club_quotes").insert({ wallet, sol_amount: sol, sol_price: p });
      return json({ usd: price, usdc: price, sol, sol_price: p, treasury: c.club_treasury, usdc_mint: USDC, valid_minutes: 30, period_days: +(c.club_period_days ?? 30) });
    }
    if (a === "verify") {
      const sig = String(body.tx ?? "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(sig)) return json({ error: "Invalid transaction signature." }, 400);
      const res = await verifyPayment(wallet, sig, c);
      return json(res, res.ok ? 200 : (res as { pending?: boolean }).pending ? 202 : 400);
    }

    const who = await me(wallet, c);
    if (!who.member) return json({ error: "Membership required.", code: "member", me: who }, 402);
    if (a === "leaderboard") { const { data, error } = await sb.rpc("club_api_leaderboard"); if (error) throw error; return json({ rows: data }); }
    if (a === "calls") {
      const { data, error } = await sb.rpc("club_api_calls", { p_limit: Math.min(+body.limit || 60, 200), p_before: typeof body.before === "string" ? body.before : null, p_source: null });
      if (error) throw error; return json({ rows: data });
    }
    if (a === "source") {
      const { data, error } = await sb.rpc("club_api_source", { p_id: +body.id || 0 });
      if (error) throw error; return data ? json({ source: data }) : json({ error: "Not found." }, 404);
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("club-api", (e as Error).message);
    return json({ error: "Something went wrong on our side. Try again." }, 500);
  }
});
