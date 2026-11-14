/* DegenKit Club front end: wallet sign-in, membership payment, leaderboard, live calls, account profiles. */
(() => {
  "use strict";
  const API = "https://dmryjxwglpdubjqpyapi.supabase.co/functions/v1/club-api";
  const RPC = "https://mainnet.helius-rpc.com/?api-key=74c953b1-4f9b-4f58-91b8-d59aa59a7a89";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
  };
  const state = { token: LS.get("dkc_token"), me: null, wallet: null, adapter: null, plat: "all", quote: null, busy: false, timer: null, picking: false };
  const wallets = new Map();

  // ---------- formatting ----------
  const CHAIN = { solana: "Solana", ethereum: "Ethereum", bsc: "BNB Chain", base: "Base", robinhood: "Robinhood Chain", elysium: "Elysium", arbitrum: "Arbitrum", polygon: "Polygon" };
  const fx = (v) => v == null ? '<b class="dim">–</b>' : `<b class="${v >= 1 ? "up" : "down"}">${(+v >= 10 ? (+v).toFixed(1) : (+v).toFixed(2))}×</b>`;
  const pct = (v) => v == null ? "–" : Math.round(v * 100) + "%";
  const num = (v, d = 0) => v == null ? "–" : (+v).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const short = (a) => a ? a.slice(0, 4) + "…" + a.slice(-4) : "";
  const ago = (t) => { const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000); return s < 90 ? Math.round(s) + "s ago" : s < 5400 ? Math.round(s / 60) + "m ago" : s < 129600 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };
  const dur = (s) => s == null ? "–" : s < 90 ? s + " s" : s < 5400 ? Math.round(s / 60) + " min" : (s / 3600).toFixed(1) + " h";
  const day = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const srcUrl = (s) => s.platform === "x" ? "https://x.com/" + encodeURIComponent(s.handle) : "https://t.me/" + encodeURIComponent(s.handle);
  const safeUrl = (u) => /^https:\/\/(x\.com|twitter\.com|t\.me)\//.test(u || "") ? u : "";
  const plat = (p) => `<span class="c-plat">${p === "x" ? "X" : "TG"}</span>`;

  // ---------- API ----------
  async function api(a, body = {}) {
    let r;
    try {
      r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", ...(state.token ? { authorization: "Bearer " + state.token } : {}) }, body: JSON.stringify({ a, ...body }) });
    } catch { throw new Error("Could not reach the Club server. Check your connection and try again."); }
    let j = {}; try { j = await r.json(); } catch { /* empty body */ }
    if (r.status === 401 && j.code === "auth") { state.token = null; state.me = null; LS.del("dkc_token"); }
    if (!r.ok && r.status !== 202) { const e = new Error(j.error || "Request failed. Try again."); e.status = r.status; e.data = j; throw e; }
    j._status = r.status; return j;
  }
  const friendly = (e) => /reject|denied|cancel|declin/i.test(e && e.message || "") ? "You cancelled the request in your wallet. Nothing was sent." : (e && e.message) || "Something went wrong. Try again.";

  // ---------- wallets (Wallet Standard, with a fallback for injected Phantom and Solflare) ----------
  function addStandard(w) {
    if (!w || !Array.isArray(w.chains) || !w.chains.some((c) => c.startsWith("solana:")) || !w.features || !w.features["standard:connect"]) return;
    wallets.set(w.name, {
      name: w.name, icon: typeof w.icon === "string" && w.icon.startsWith("data:image/") ? w.icon : "",
      async connect() { const { accounts } = await w.features["standard:connect"].connect(); if (!accounts || !accounts.length) throw new Error("The wallet returned no account."); this.account = accounts[0]; return accounts[0].address; },
      async signMessage(bytes) { const f = w.features["solana:signMessage"]; if (!f) throw new Error(w.name + " cannot sign messages. Use Phantom, Solflare or Backpack."); const [r] = await f.signMessage({ account: this.account, message: bytes }); return r.signature; },
      async signTx(bytes) { const f = w.features["solana:signTransaction"]; if (!f) throw new Error(w.name + " cannot sign transactions here."); const [r] = await f.signTransaction({ transaction: bytes, account: this.account, chain: "solana:mainnet" }); return r.signedTransaction; },
    });
    if (state.picking) renderJoin();
  }
  function addLegacy(name, p) {
    if (!p || wallets.has(name)) return;
    wallets.set(name, {
      name, icon: "/assets/wallets/" + name.toLowerCase() + ".png",
      async connect() { const r = await p.connect(); const pk = (r && r.publicKey) || p.publicKey; if (!pk) throw new Error("The wallet returned no account."); return pk.toString(); },
      async signMessage(bytes) { const r = await p.signMessage(bytes, "utf8"); return r.signature || r; },
      async signTx(bytes) { const { web3 } = await libs(); const signed = await p.signTransaction(web3.Transaction.from(bytes)); return signed.serialize(); },
    });
    if (state.picking) renderJoin();
  }
  const stdApi = { register: (...ws) => { ws.forEach(addStandard); return () => {}; } };
  window.addEventListener("wallet-standard:register-wallet", (e) => { try { e.detail(stdApi); } catch { /* not a standard wallet */ } });
  try { window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: stdApi })); } catch { /* old browser */ }
  [500, 1500, 3000].forEach((ms) => setTimeout(() => { addLegacy("Phantom", window.phantom && window.phantom.solana); addLegacy("Solflare", window.solflare); }, ms));

  let libsP = null;
  function libs() {
    if (!libsP) libsP = (async () => {
      const sources = [
        ["https://esm.sh/@solana/web3.js@1.95.4", "https://esm.sh/@solana/spl-token@0.4.9", "https://esm.sh/buffer@6.0.3"],
        ["https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.4/+esm", "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.9/+esm", "https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm"],
      ];
      for (const [a, b, c] of sources) {
        try { const [web3, spl, buf] = await Promise.all([import(a), import(b), import(c)]); if (!window.Buffer) window.Buffer = buf.Buffer; return { web3, spl }; } catch (e) { console.error("library source failed", a, e); }
      }
      libsP = null; throw new Error("Could not load the Solana libraries. Check your connection and reload the page.");
    })();
    return libsP;
  }

  // ---------- sign-in and payment ----------
  async function connect(name) {
    const ad = wallets.get(name); if (!ad) return;
    const addr = await ad.connect();
    if (state.me && state.me.wallet !== addr) throw new Error("This wallet (" + short(addr) + ") is not the one you signed in with (" + short(state.me.wallet) + "). Switch accounts in your wallet or sign out first.");
    state.adapter = ad; state.wallet = addr; state.picking = false;
  }
  async function signIn() {
    const { message } = await api("nonce", { wallet: state.wallet });
    const sig = await state.adapter.signMessage(new TextEncoder().encode(message));
    const r = await api("login", { wallet: state.wallet, signature: btoa(String.fromCharCode(...new Uint8Array(sig))) });
    state.token = r.token; LS.set("dkc_token", r.token); state.me = r.me;
  }
  async function pay(asset) {
    const q = state.quote = await api("quote");
    const { web3, spl } = await libs();
    const conn = new web3.Connection(RPC, "confirmed");
    const from = new web3.PublicKey(state.wallet), to = new web3.PublicKey(q.treasury);
    const tx = new web3.Transaction();
    if (asset === "SOL") {
      tx.add(web3.SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: Math.round(q.sol * 1e9) }));
    } else {
      const mint = new web3.PublicKey(q.usdc_mint);
      const src = spl.getAssociatedTokenAddressSync(mint, from), dst = spl.getAssociatedTokenAddressSync(mint, to);
      tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(from, dst, to, mint));
      tx.add(spl.createTransferCheckedInstruction(src, mint, dst, from, BigInt(Math.round(q.usdc * 1e6)), 6));
    }
    tx.feePayer = from;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    setMsg("Approve the payment in your wallet.");
    const signed = await state.adapter.signTx(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
    setMsg("Sending the transaction…");
    let sig;
    try { sig = await conn.sendRawTransaction(signed, { maxRetries: 5 }); }
    catch (e) { throw new Error(/insufficient|0x1\b|debit an account/i.test(e.message || "") ? "Not enough " + asset + " in this wallet for the payment and the network fee." : "The network rejected the transaction: " + (e.message || "unknown error")); }
    LS.set("dkc_pending", sig);
    await confirmPayment(sig);
  }
  async function confirmPayment(sig) {
    for (let i = 0; i < 12; i++) {
      setMsg("Payment sent. Waiting for the network to confirm it…");
      let r;
      try { r = await api("verify", { tx: sig }); }
      catch (e) { if (e.status === 400) { LS.del("dkc_pending"); throw e; } r = {}; }
      if (r.ok) { LS.del("dkc_pending"); state.me = r.me; return; }
      await sleep(4000);
    }
    throw new Error("We could not confirm the payment yet. Your transaction is saved on this device: press “Check my payment” in a minute.");
  }

  // ---------- landing: stats, sample, join card ----------
  let msgText = "", msgKind = "";
  function setMsg(t, kind = "") { msgText = t; msgKind = kind; const el = $("#cMsg"); if (el) { el.textContent = t; el.className = "c-msg" + (kind ? " " + kind : ""); } }
  async function act(fn) {
    if (state.busy) return;
    state.busy = true; renderJoin();
    try { await fn(); setMsg(""); } catch (e) { setMsg(friendly(e), "err"); }
    state.busy = false; route();
  }
  function renderJoin() {
    const box = $("#cJoin"); if (!box) return;
    const me = state.me, dis = state.busy ? " disabled" : "";
    const s1 = me || state.wallet, s2 = !!me, mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const here = encodeURIComponent(location.href.split("#")[0]), ref = encodeURIComponent(location.origin);
    const list = [...wallets.values()].map((w) => `<button class="c-btn" data-wallet="${esc(w.name)}"${dis}>${w.icon ? `<img src="${esc(w.icon)}" alt="">` : ""}Connect ${esc(w.name)}</button>`).join("");
    const none = `<span>No Solana wallet found in this browser.${mobile ? " On a phone, open this page inside your wallet app:" : " Install Phantom or Solflare, then reload."}</span>
      <div class="act">${mobile ? `<a class="c-btn" href="https://phantom.app/ul/browse/${here}?ref=${ref}">Open in Phantom</a><a class="c-btn" href="https://solflare.com/ul/v1/browse/${here}?ref=${ref}">Open in Solflare</a>` : `<a class="c-btn" href="https://phantom.app/" target="_blank" rel="noopener">Get Phantom</a><a class="c-btn" href="https://solflare.com/" target="_blank" rel="noopener">Get Solflare</a>`}</div>`;
    const needWallet = !state.adapter;
    const q = state.quote;
    box.innerHTML = `<ol class="c-steps">
      <li class="${s1 ? "done" : "now"}"><div><b>Connect your Solana wallet</b>
        ${s1 ? `<span>Connected: <span class="c-mono">${esc(short(state.wallet || me.wallet))}</span></span>` : (state.picking ? (list ? `<div class="c-wallets">${list}</div>` : none) : `<span>Phantom, Solflare, Backpack and other Solana wallets work.</span><div class="act"><button class="c-btn pri" data-do="pick"${dis}>Connect wallet</button></div>`)}
      </div></li>
      <li class="${s2 ? "done" : s1 ? "now" : ""}"><div><b>Sign in</b>
        <span>${s2 ? "Signed in." : "Sign a short text message to prove the wallet is yours. It is free and moves nothing."}</span>
        ${!s2 && s1 ? `<div class="act"><button class="c-btn pri" data-do="signin"${dis}>${state.busy ? "Waiting for your wallet…" : "Sign in with wallet"}</button></div>` : ""}
      </div></li>
      <li class="${me && me.member ? "done" : s2 ? "now" : ""}"><div><b>Pay for ${me ? me.period_days : 30} days</b>
        <span>${me && me.member ? "Active" + (me.paid_until ? " until " + esc(day(me.paid_until)) : "") + ". Paying again adds another " + me.period_days + " days." : "Send $" + (me ? me.price_usd : 99) + " in SOL or USDC from this wallet. Access opens when the transaction confirms."}</span>
        ${s2 ? (needWallet ? `<div class="act">${state.picking ? (list ? `<div class="c-wallets">${list}</div>` : none) : `<button class="c-btn pri" data-do="pick"${dis}>Reconnect wallet to pay</button>`}</div>`
          : `<div class="act"><button class="c-btn pri" data-do="pay-usdc"${dis}>Pay ${me.price_usd} USDC</button><button class="c-btn" data-do="pay-sol"${dis}>Pay in SOL${q ? " (" + q.sol + " SOL)" : ""}</button>${LS.get("dkc_pending") ? `<button class="c-btn" data-do="check"${dis}>Check my payment</button>` : ""}</div>`) : ""}
      </div></li></ol>
      <p class="c-msg${msgKind ? " " + msgKind : ""}" id="cMsg" role="status" aria-live="polite">${esc(msgText)}</p>
      ${s2 ? `<p class="c-fine"><button class="c-link" data-do="signout">Sign out</button>${me.member ? ` · <a href="#/board">Open the leaderboard</a>` : ""}</p>` : ""}`;
  }
  document.addEventListener("click", (e) => {
    const w = e.target.closest("[data-wallet]"), d = e.target.closest("[data-do]"), cp = e.target.closest("[data-copy]"), ch = e.target.closest("[data-plat]");
    if (w) return act(() => connect(w.dataset.wallet));
    if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy).then(() => { const t = cp.textContent; cp.textContent = "Copied"; setTimeout(() => (cp.textContent = t), 1200); }); return; }
    if (ch) { state.plat = ch.dataset.plat; if (document.querySelector('#cSum')) { document.querySelectorAll('[data-plat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.plat === state.plat))); return renderCalls(); } return route(); }
    if (!d) return;
    const k = d.dataset.do;
    if (k === "pick") { state.picking = true; renderJoin(); }
    else if (k === "signin") act(signIn);
    else if (k === "pay-usdc") act(() => pay("USDC"));
    else if (k === "pay-sol") act(() => pay("SOL"));
    else if (k === "check") act(() => confirmPayment(LS.get("dkc_pending")));
    else if (k === "signout") { api("logout").catch(() => {}); state.token = null; state.me = null; state.wallet = null; state.adapter = null; LS.del("dkc_token"); location.hash = ""; route(); }
  });
  async function loadPublic() {
    try {
      const p = await api("public");
      const set = (id, v) => { const el = $(id); if (el) el.textContent = num(v); };
      set("#stX", p.sources_x); set("#stTg", p.sources_tg); set("#stCalls", p.calls); set("#st24", p.calls_24h);
      const rows = (p.sample || []).map((r) => `<tr><td>${esc(day(r.posted_at))}</td><td><span class="c-acct">${plat(r.platform)}<b>${esc(r.handle)}</b></span></td><td>${esc(r.symbol || "?")} <span class="dim">${esc(CHAIN[r.chain] || r.chain)}</span></td><td>${fx(r.x_peak)} <span class="dim">after ${esc(dur(r.secs_to_peak))}</span></td><td>${fx(r.x_1h)}</td><td>${fx(r.x_24h)}</td><td>${pct(r.hold)}</td><td><span class="c-badge ${esc(r.outcome)}">${esc(r.outcome)}</span></td><td class="${r.points >= 0 ? "up" : "down"}">${r.points > 0 ? "+" : ""}${num(r.points, 1)}</td></tr>`).join("");
      if (rows) { $("#cSampleBody").innerHTML = rows; $("#cSample").hidden = false; }
    } catch { /* the landing page works without live numbers */ }
  }

  // ---------- live market data (DexScreener, straight from the browser, every 10 s) ----------
  const GT = { solana: "solana", ethereum: "eth", bsc: "bsc", base: "base", robinhood: "robinhood", elysium: "elysium", arbitrum: "arbitrum", polygon: "polygon_pos" };
  const live = new Map(), model = { calls: [], open: null, chart: null, sort: "new", liveOnly: false, at: 0 };
  const key = (t) => t.chain + ":" + t.address;
  const money = (v) => v == null || !isFinite(v) ? "–" : v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(1) + "k" : "$" + Math.round(v);
  const usd = (v) => v == null || !isFinite(v) ? "–" : v >= 1 ? "$" + (+v).toFixed(2) : "$" + (+v).toPrecision(3).replace(/e-(\d+)/, (_, n) => "e-" + n);
  const chg = (v) => v == null ? '<span class="dim">–</span>' : `<span class="${v >= 0 ? "up" : "down"}">${v > 0 ? "+" : ""}${Math.abs(v) >= 100 ? Math.round(v) : (+v).toFixed(1)}%</span>`;
  const base = (c) => +c.entry || +c.seen || 0;
  const nowX = (c) => { const l = live.get(key(c.token)), b = base(c); return l && l.price && b ? l.price / b : c.x_now; };
  const clock = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // ---------- odds from past calls ----------
  const MIN_N = 5;
  function calcOdds(list) {
    const f = list.filter((c) => c.status === "final" && c.x_peak != null && c.x_24h != null), n = f.length; if (!n) return null;
    const avg = (fn) => f.reduce((a, c) => a + fn(c), 0) / n;
    return { n, below24: avg((c) => +(c.x_24h < 1)), fast: avg((c) => +!!c.dumped_fast), rug: avg((c) => +(c.outcome === "rug")), hold_ev: avg((c) => +c.x_24h),
      targets: [1.2, 1.5, 2, 3, 5].map((m) => ({ m, p: avg((c) => +(c.x_peak >= m)), ev: avg((c) => c.x_peak >= m ? m : +c.x_24h) })) };
  }
  function riskOf(c) { const o = c.source.odds; if (o && o.n >= MIN_N) return { p: +o.below24, own: true }; const b = model.base; return b && b.n >= MIN_N ? { p: b.below24, own: false } : null; }
  const riskCls = (p) => p >= 0.65 ? "down" : p >= 0.45 ? "warn" : "up";
  function oddsCard(o, who, note) {
    if (!o || !o.n) return `<section class="c-odds"><h4>Odds from past calls</h4><p class="c-fine" style="margin:0">No finished calls yet. Odds appear once the first calls reach 24 hours.</p></section>`;
    const best = o.targets.slice().sort((a, b) => b.ev - a.ev)[0], hold = +o.hold_ev, t15 = o.targets.find((t) => +t.m === 1.5), t2 = o.targets.find((t) => +t.m === 2);
    const tag = ' <span class="c-badge win">best in history</span>';
    const rows = o.targets.map((t) => `<tr class="${t === best && t.ev > hold ? "best" : ""}"><td>${+t.m}×</td><td><span class="c-pbar"><i style="width:${Math.round(t.p * 100)}%"></i></span><span class="c-pv">${pct(t.p)}</span></td><td class="${t.ev >= 1 ? "up" : "down"}">${(+t.ev).toFixed(2)}×${t === best && t.ev > hold ? tag : ""}</td></tr>`).join("");
    return `<section class="c-odds"><h4>Odds from past calls · ${who}</h4>
      <p class="c-oddsline">In ${+o.n} finished call${+o.n === 1 ? "" : "s"}: <b>${pct(t15.p)}</b> reached 1.5×, <b>${pct(t2.p)}</b> reached 2×. After 24 hours <b class="${riskCls(+o.below24)}">${pct(o.below24)}</b> were below entry${+o.fast > 0 ? `, and <b>${pct(o.fast)}</b> had halved within the first hour` : ""}.</p>
      <div class="c-tablewrap"><table class="c-table c-otable"><thead><tr><th>Exit target</th><th>Calls that reached it</th><th>Average result if sold there</th></tr></thead><tbody>${rows}
      <tr class="${hold >= best.ev ? "best" : ""}"><td>Held 24 h</td><td class="dim">–</td><td class="${hold >= 1 ? "up" : "down"}">${hold.toFixed(2)}×${hold >= best.ev ? tag : ""}</td></tr></tbody></table></div>
      <p class="c-fine">${note ? note + " " : ""}“Average result if sold there” counts calls that never reached the target at their 24-hour price. It assumes a buy in the minute of the call and a fill exactly at the target, which real trades rarely get. ${+o.n < 20 ? "With only " + (+o.n) + " calls these numbers swing a lot. " : ""}Past calls do not predict this one. Not advice.</p></section>`;
  }

  async function pollLive() {
    const by = new Map();
    for (const c of model.calls) { if (!by.has(c.token.chain)) by.set(c.token.chain, new Set()); by.get(c.token.chain).add(c.token.address); }
    const jobs = [];
    for (const [chain, set] of by) {
      const a = [...set];
      for (let i = 0; i < a.length; i += 30) jobs.push(fetch(`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(chain)}/${a.slice(i, i + 30).join(",")}`).then((r) => r.ok ? r.json() : []).then((pairs) => {
        const best = new Map();
        for (const p of Array.isArray(pairs) ? pairs : []) { const k = chain + ":" + (chain === "solana" ? p.baseToken.address : p.baseToken.address.toLowerCase()); const cur = best.get(k); if (!cur || ((p.liquidity && p.liquidity.usd) || 0) > ((cur.liquidity && cur.liquidity.usd) || 0)) best.set(k, p); }
        for (const [k, p] of best) { const prev = live.get(k); live.set(k, { price: +p.priceUsd || 0, prev: prev ? prev.price : null, mcap: p.marketCap || p.fdv, liq: p.liquidity && p.liquidity.usd, vol: p.volume && p.volume.h24, m5: p.priceChange && p.priceChange.m5, h1: p.priceChange && p.priceChange.h1, buys: p.txns && p.txns.h1 && p.txns.h1.buys, sells: p.txns && p.txns.h1 && p.txns.h1.sells, pair: p.pairAddress, dex: p.dexId, born: p.pairCreatedAt }); }
      }).catch(() => {}));
    }
    await Promise.all(jobs);
    model.at = Date.now(); paintLive();
  }
  function paintLive() {
    document.querySelectorAll(".c-row[data-id]").forEach((row) => {
      const c = model.calls.find((x) => x.id === +row.dataset.id); if (!c) return;
      const l = live.get(key(c.token)), x = nowX(c), el = $(".f-now", row);
      if (el) { const old = el.dataset.v; el.innerHTML = fx(x); el.dataset.v = x == null ? "" : (+x).toFixed(3); if (old && old !== el.dataset.v) { el.classList.remove("fl-up", "fl-down"); void el.offsetWidth; el.classList.add(+el.dataset.v >= +old ? "fl-up" : "fl-down"); } }
      const pk = $(".f-peak", row); if (pk && c.status !== "final") pk.innerHTML = fx(c.x_peak == null ? null : Math.max(+c.x_peak, x || 0));
      if (l) { const m = $(".f-mc", row), f = $(".f-m5", row); if (m) m.textContent = money(l.mcap); if (f) f.innerHTML = chg(l.m5); }
    });
    const sum = $("#cSum"); if (sum) sum.innerHTML = summary();
    if (model.open && model.chart && model.chart.id === model.open) {
      const c = model.calls.find((x) => x.id === model.open), l = c && live.get(key(c.token));
      if (l && l.price && Date.now() / 1000 < model.chart.cap) { const t = Math.floor(Date.now() / 1000), p = model.chart.pts; if (p.length && t - p[p.length - 1][0] < 60 && p[p.length - 1][2]) p[p.length - 1] = [t, l.price, 1]; else p.push([t, l.price, 1]); drawChart(); }
      const box = $("#cMarket"); if (box && c) box.innerHTML = marketCard(c);
    }
  }
  function summary() {
    const day = model.calls.filter((c) => Date.now() - new Date(c.posted_at).getTime() < 864e5), xs = day.map((c) => [c, nowX(c)]).filter((a) => a[1] != null);
    const up = xs.filter((a) => a[1] >= 1).length, best = xs.slice().sort((a, b) => b[1] - a[1])[0], worst = xs.slice().sort((a, b) => a[1] - b[1])[0], med = xs.map((a) => a[1]).sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const t = (l, v, s) => `<div class="c-stat"><b>${v}</b><span>${l}${s ? " · " + s : ""}</span></div>`;
    return t("Calls, last 24 h", day.length) + t("Above entry now", xs.length ? Math.round(up / xs.length * 100) + "%" : "–", xs.length ? up + " of " + xs.length : "") + t("Median, now vs entry", med == null ? "–" : (+med).toFixed(2) + "×")
      + t("Best right now", best ? (+best[1]).toFixed(2) + "×" : "–", best ? esc(best[0].token.symbol || "") : "") + t("Worst right now", worst ? (+worst[1]).toFixed(2) + "×" : "–", worst ? esc(worst[0].token.symbol || "") : "");
  }

  // ---------- call row and detail ----------
  function callRow(c) {
    const t = c.token, s = c.source, img = /^https:\/\//.test(t.image || "") ? `<img src="${esc(t.image)}" alt="" loading="lazy" width="34" height="34">` : '<span class="ph"></span>';
    const liveNow = c.status !== "final", x = nowX(c), l = live.get(key(t));
    const badge = c.status === "final" ? `<span class="c-badge ${esc(c.outcome)}">${esc(c.outcome)}</span>` : c.status === "tracking" ? '<span class="c-badge live">Tracking</span>' : c.status === "no_data" ? '<span class="c-badge">No data</span>' : '<span class="c-badge live">New</span>';
    const pts = c.points == null ? "" : `<small class="${c.points >= 0 ? "up" : "down"}">${c.points > 0 ? "+" : ""}${num(c.points, 1)} pts${liveNow ? " so far" : ""}</small>`;
    const open = model.open === c.id, risk = riskOf(c);
    return `<article class="c-row${open ? " open" : ""}" data-id="${+c.id}">
      <div class="c-main">
        <div class="tok">${img}<div style="min-width:0"><b>${esc(t.symbol || "Unknown token")}</b><span>${esc(CHAIN[t.chain] || t.chain)} · ${esc(short(t.address))}</span></div></div>
        <div class="src"><a href="#/a/${+s.id}">${esc(s.platform === "x" ? "@" + s.handle : s.handle)}</a><span>${s.score != null && s.scored >= 5 ? "score " + num(s.score, 0) + " · " : ""}${esc(ago(c.posted_at))}${c.others && c.others.length ? " · +" + c.others.length + " more" : ""}</span></div>
        <div class="m"><i>Mkt cap</i><b class="f-mc">${l ? money(l.mcap) : money(c.mcap)}</b></div>
        <div class="m"><i>5 min</i><b class="f-m5">${l ? chg(l.m5) : '<span class="dim">–</span>'}</b></div>
        <div class="m"><i>Now</i><span class="f-now" data-v="${x == null ? "" : (+x).toFixed(3)}">${fx(x)}</span></div>
        <div class="m"><i>Peak</i><span class="f-peak">${fx(c.x_peak == null ? null : liveNow ? Math.max(+c.x_peak, x || 0) : c.x_peak)}</span></div>
        <div class="m"><i>1 h</i>${fx(c.x_1h)}</div><div class="m"><i>6 h</i>${fx(c.x_6h)}</div><div class="m"><i>24 h</i>${fx(c.x_24h)}</div>
        <div class="m"><i>Risk</i>${risk ? `<b class="${riskCls(risk.p)}">${risk.own ? "" : "~"}${pct(risk.p)}</b>` : '<b class="dim">–</b>'}</div>
        <div class="res">${badge}${pts}</div>
        <button class="c-chev" data-open="${+c.id}" aria-expanded="${open}" aria-label="${open ? "Hide" : "Show"} analysis for ${esc(t.symbol || "token")}"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
      <div class="c-detail"${open ? "" : " hidden"}>${open ? detail(c) : ""}</div>
    </article>`;
  }
  const kv = (rows) => `<dl class="c-kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  function marketCard(c) {
    const l = live.get(key(c.token)) || {}, b = base(c);
    return kv([["Price now", usd(l.price)], ["Now vs entry", l.price && b ? fx(l.price / b) : fx(c.x_now)], ["Market cap", money(l.mcap)], ["Liquidity", money(l.liq)], ["Volume, 24 h", money(l.vol)], ["Change, 5 min / 1 h", chg(l.m5) + " / " + chg(l.h1)],
      ["Buys / sells, 1 h", l.buys == null ? "–" : num(l.buys) + " / " + num(l.sells)], ["Pool", esc((l.dex || c.dex || "–") + (l.born ? " · opened " + ago(l.born) : ""))]]);
  }
  function detail(c) {
    const t = c.token, post = safeUrl(c.post_url), t0 = new Date(c.posted_at).getTime();
    const rel = (at) => { const d = Math.round((new Date(at).getTime() - t0) / 1000), a = Math.abs(d); return (a < 90 ? a + " s" : a < 5400 ? Math.round(a / 60) + " min" : (a / 3600).toFixed(1) + " h") + (d < 0 ? " earlier" : " later"); };
    const others = (c.others || []).map((o) => `<li><a href="#/a/${+o.id}">${esc(o.platform === "x" ? "@" + o.handle : o.handle)}</a> <span class="${new Date(o.at).getTime() < t0 ? "up" : "dim"}">${esc(rel(o.at))}</span>${o.score != null ? ` <span class="dim">· score ${num(o.score, 0)}</span>` : ""}</li>`).join("");
    const firstBy = (c.others || []).some((o) => new Date(o.at).getTime() < t0) ? "" : (c.others || []).length ? '<p class="c-fine up" style="margin:0 0 8px">First of the tracked accounts to post it.</p>' : "";
    const why = c.points == null ? "Scoring starts 3 minutes after the call, once the first candles exist." :
      `Blended return ${c.blend == null ? "–" : (+c.blend).toFixed(2) + "×"} (1 h counts 50%, 6 h 30%, 24 h 20%), price above entry ${pct(c.hold)} of the time${c.dumped_fast ? ", halved within the first hour" : ""}: <b class="${c.points >= 0 ? "up" : "down"}">${c.points > 0 ? "+" : ""}${num(c.points, 2)} points</b>${c.status !== "final" ? " so far; final at 24 h" : ""}.`;
    const o = c.source.odds, who = esc(c.source.platform === "x" ? "@" + c.source.handle : c.source.handle);
    const odds = (o && o.n >= MIN_N) || !model.base ? oddsCard(o, who) : oddsCard(model.base, "all tracked accounts", `${who} has ${o ? +o.n : 0} finished call${o && +o.n === 1 ? "" : "s"}, too few for its own odds, so this table uses the last ${+model.base.n} finished calls across all accounts.`);
    return `<div class="c-chartbox"><div class="c-charthead"><b>Price since the call</b><span class="dim" id="cChartNote">Loading candles…</span></div><div id="cChart" class="c-chart"></div></div>
      <div class="c-dgrid">
        <section><h4>Since the call</h4>${kv([["Called at", esc(clock(c.posted_at)) + " · " + esc(day(c.posted_at))], [c.entry ? "Entry price" : "First price seen", usd(base(c))], ["Peak", fx(c.x_peak) + (c.secs_to_peak != null ? ` <span class="dim">after ${esc(dur(c.secs_to_peak))}</span>` : "")], ["Deepest drop", c.dd == null ? "–" : `<span class="${c.dd < -0.3 ? "down" : ""}">${Math.round(c.dd * 100)}%</span>`],
          ["Time above entry", pct(c.hold)], ["At 1 h / 6 h / 24 h", fx(c.x_1h) + " / " + fx(c.x_6h) + " / " + fx(c.x_24h)], ["Halved in first hour", c.dumped_fast ? '<span class="down">Yes</span>' : c.points == null ? "–" : "No"], ["Result", c.outcome ? `<span class="c-badge ${esc(c.outcome)}">${esc(c.outcome)}</span>${c.status !== "final" ? ' <span class="dim">provisional</span>' : ""}` : "–"]])}</section>
        <section><h4>Market now <span class="c-livedot" aria-hidden="true"></span></h4><div id="cMarket">${marketCard(c)}</div></section>
        <section><h4>Who called it</h4>${firstBy}<ul class="c-others"><li><a href="#/a/${+c.source.id}">${esc(c.source.platform === "x" ? "@" + c.source.handle : c.source.handle)}</a> <span class="dim">this call${c.source.score != null ? " · score " + num(c.source.score, 0) : ""}${c.source.rank ? " · rank #" + (+c.source.rank) : ""}</span></li>${others}</ul>
          ${others ? "" : '<p class="c-fine" style="margin:8px 0 0">No other tracked account has posted this contract.</p>'}${c.repeats ? `<p class="c-fine" style="margin:8px 0 0">Posted again ${+c.repeats}× by the same account.</p>` : ""}</section>
      </div>
      ${odds}
      <p class="c-why">${why}</p>
      <div class="c-dlinks"><q>${esc((c.excerpt || "").replace(/\s+/g, " "))}</q>${post ? `<a href="${esc(post)}" target="_blank" rel="noopener nofollow">Open post</a>` : ""}<a href="https://dexscreener.com/${encodeURIComponent(t.chain)}/${encodeURIComponent(t.address)}" target="_blank" rel="noopener nofollow">Open full chart</a><button class="c-link" data-copy="${esc(t.address)}">Copy address</button></div>`;
  }
  async function loadChart(c) {
    const t0 = Math.floor(new Date(c.posted_at).getTime() / 1000), now = Math.floor(Date.now() / 1000), end = Math.min(now, t0 + 86400), span = end - t0;
    const start = t0 - Math.max(600, Math.round(span * 0.08)), agg = end - start <= 15 * 3600 ? 1 : 5;
    const l = live.get(key(c.token)) || {}, pair = c.pair || l.pair, note = $("#cChartNote");
    model.chart = { id: c.id, pts: [], entry: base(c), t0, cap: t0 + 86400, loading: true };
    try {
      if (!pair || !GT[c.token.chain]) throw new Error("no pool");
      const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/${GT[c.token.chain]}/pools/${encodeURIComponent(pair)}/ohlcv/minute?aggregate=${agg}&limit=1000&before_timestamp=${end + 60}&currency=usd`);
      if (!r.ok) throw new Error(r.status === 429 ? "rate" : "http");
      const list = ((await r.json()).data.attributes.ohlcv_list || []).map((k) => [k[0], k[4]]).filter((k) => k[0] >= start && k[0] <= end && k[1] > 0).sort((a, b) => a[0] - b[0]);
      if (model.open !== c.id) return;
      model.chart.pts = list; model.chart.loading = false;
      if (!model.chart.entry && list.length) model.chart.entry = (list.find((k) => k[0] >= t0) || list[0])[1];
      if (note) note.textContent = `${agg}-minute closes · entry = price in the minute of the call`;
      drawChart();
    } catch (e) {
      model.chart.loading = false;
      if (note) note.textContent = "";
      const el = $("#cChart"); if (el) el.innerHTML = `<div class="c-empty" style="padding:22px">${e.message === "rate" ? "<b>The chart source is busy</b>Too many chart requests in a minute. Wait a moment and open this call again." : "<b>No candles for this pool yet</b>Use “Open full chart” to see the pool on DexScreener."}</div>`;
    }
  }
  function drawChart() {
    const el = $("#cChart"), ch = model.chart; if (!el || !ch || ch.loading) return;
    const pts = ch.pts, E = ch.entry;
    if (pts.length < 2 || !E) { el.innerHTML = '<div class="c-empty" style="padding:22px"><b>Not enough trades yet</b>The path appears once the pool has a few minutes of trades after the call.</div>'; return; }
    const W = 860, H = 280, L = 50, R = 14, T = 16, B = 26, ys = pts.map((p) => p[1] / E);
    const x0 = Math.min(pts[0][0], ch.t0 - 60), x1 = Math.max(pts[pts.length - 1][0], ch.t0 + 120);
    let y0 = Math.min(1, ...ys), y1 = Math.max(1, ...ys); const pad = (y1 - y0) * 0.1 || 0.05; y0 = Math.max(0, y0 - pad); y1 += pad;
    const X = (t) => L + (t - x0) / (x1 - x0) * (W - L - R), Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const d = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(ys[i]).toFixed(1)).join(" ");
    const last = ys[ys.length - 1], col = last >= 1 ? "#1CE39B" : "#FF8FA8";
    let pi = -1; pts.forEach((p, i) => { if (p[0] >= ch.t0 && (pi < 0 || ys[i] > ys[pi])) pi = i; });
    const marks = [[0, "Call"], [3600, "1 h"], [21600, "6 h"], [86400, "24 h"]].filter((m) => ch.t0 + m[0] <= x1).map((m) => `<line x1="${X(ch.t0 + m[0]).toFixed(1)}" x2="${X(ch.t0 + m[0]).toFixed(1)}" y1="${T}" y2="${H - B}" class="${m[0] ? "ck" : "call"}"/><text x="${(X(ch.t0 + m[0]) + 4).toFixed(1)}" y="${T + 10}" class="lb${m[0] ? "" : " hot"}">${m[1]}</text>`).join("");
    const yt = [...new Set([y0, 1, (1 + y1) / 2, y1].map((v) => +v.toFixed(2)))].map((v) => `<text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="lb">${v.toFixed(2)}×</text><line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${v === 1 ? "entry" : "grid"}"/>`).join("");
    const xt = [0, 1, 2, 3, 4].map((i) => { const t = x0 + (x1 - x0) * i / 4; return `<text x="${X(t).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}" class="lb">${new Date(t * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</text>`; }).join("");
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Price path since the call, in multiples of the entry price. Now ${last.toFixed(2)} times entry.">
      ${yt}${marks}<path d="${d} L${X(pts[pts.length - 1][0]).toFixed(1)} ${H - B} L${X(pts[0][0]).toFixed(1)} ${H - B} Z" fill="${col}" opacity=".07"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
      ${pi >= 0 ? `<circle cx="${X(pts[pi][0]).toFixed(1)}" cy="${Y(ys[pi]).toFixed(1)}" r="4" fill="#FFA149"/><text x="${Math.min(W - R - 70, X(pts[pi][0]) + 8).toFixed(1)}" y="${Math.max(T + 22, Y(ys[pi]) - 8).toFixed(1)}" class="lb hot">peak ${ys[pi].toFixed(2)}×</text>` : ""}
      <circle cx="${X(pts[pts.length - 1][0]).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="4" fill="${col}"/>${xt}
      <line id="cCross" y1="${T}" y2="${H - B}" class="cross" visibility="hidden"/><text id="cTip" y="${H - B - 6}" class="lb tip" visibility="hidden"></text><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" id="cHit"/></svg>`;
    const hit = $("#cHit", el), cross = $("#cCross", el), tip = $("#cTip", el);
    hit.addEventListener("pointermove", (ev) => {
      const r = hit.getBoundingClientRect(), t = x0 + (ev.clientX - r.left) / r.width * (x1 - x0);
      let bi = 0; for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - t) < Math.abs(pts[bi][0] - t)) bi = i;
      const cx = X(pts[bi][0]); cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
      tip.textContent = `${clock(pts[bi][0] * 1000)}  ${ys[bi].toFixed(2)}×  ${usd(pts[bi][1])}`; tip.setAttribute("x", Math.min(W - R - 190, Math.max(L + 4, cx + 8))); tip.setAttribute("visibility", "visible");
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tip.setAttribute("visibility", "hidden"); });
  }
  function toggle(id) {
    model.open = model.open === id ? null : id; model.chart = null;
    document.querySelectorAll(".c-row[data-id]").forEach((row) => {
      const c = model.calls.find((x) => x.id === +row.dataset.id), on = c && c.id === model.open, d = $(".c-detail", row), b = $(".c-chev", row);
      row.classList.toggle("open", !!on); d.hidden = !on; d.innerHTML = on ? detail(c) : ""; b.setAttribute("aria-expanded", String(!!on));
      if (on) loadChart(c);
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]"), main = e.target.closest(".c-main"), so = e.target.closest("[data-sort]"), lo = e.target.closest("[data-liveonly]");
    if (b) return toggle(+b.dataset.open);
    if (so) { model.sort = so.dataset.sort; return renderCalls(); }
    if (lo) { model.liveOnly = !model.liveOnly; return renderCalls(); }
    if (main && !e.target.closest("a,button")) toggle(+main.parentElement.dataset.id);
  });

  const skeleton = '<div class="c-calls"><div class="c-skel"></div><div class="c-skel"></div><div class="c-skel"></div></div>';
  const failed = (e) => `<div class="c-empty"><b>Could not load this view</b>${esc(friendly(e))}<br><button class="c-btn sm" style="margin-top:12px" onclick="location.reload()">Reload</button></div>`;
  const chip = (attr, on, label) => `<button class="c-chip" ${attr} aria-pressed="${on}">${label}</button>`;
  const chips = () => `<div class="c-filters" role="group" aria-label="Source">${[["all", "All sources"], ["x", "X"], ["telegram", "Telegram"]].map(([k, l]) => chip(`data-plat="${k}"`, state.plat === k, l)).join("")}</div>`;
  function renderCalls() {
    const box = $("#cList"); if (!box) return;
    model.base = model.allPlat ? null : calcOdds(model.calls);
    let list = model.calls.filter((r) => (model.allPlat || state.plat === "all" || r.source.platform === state.plat) && (!model.liveOnly || r.status !== "final"));
    if (model.sort !== "new") list = list.slice().sort((a, b) => { const x = nowX(a), y = nowX(b); return (x == null) - (y == null) || (model.sort === "best" ? y - x : x - y); });
    const tools = $("#cTools"); if (tools) tools.innerHTML = [["new", "Newest"], ["best", "Best now"], ["worst", "Worst now"]].map(([k, l]) => chip(`data-sort="${k}"`, model.sort === k, l)).join("") + chip("data-liveonly", model.liveOnly, "Still tracking only");
    box.innerHTML = list.length ? list.map(callRow).join("") : `<div class="c-empty"><b>No calls match these filters</b>Clear a filter, or wait: new calls show up within about a minute of being posted.</div>`;
    if (model.open) { const c = model.calls.find((x) => x.id === model.open); if (c && $(`.c-row[data-id="${c.id}"]`)) { if (model.chart && model.chart.id === c.id && !model.chart.loading) drawChart(); else loadChart(c); } else model.open = null; }
  }
  function startLive(fetchRows) {
    clearInterval(state.timer); clearInterval(state.t2); clearInterval(state.t3);
    pollLive();
    state.timer = setInterval(() => { if (!document.hidden) pollLive(); }, 10000);
    state.t2 = setInterval(() => { if (!document.hidden) fetchRows().then((rows) => { const known = new Set(model.calls.map((c) => c.id)); model.calls = rows; renderCalls(); if (rows.some((r) => !known.has(r.id))) pollLive(); }).catch(() => {}); }, 20000);
    state.t3 = setInterval(() => { const el = $("#cAgo"); if (el) el.textContent = model.at ? "prices updated " + Math.max(0, Math.round((Date.now() - model.at) / 1000)) + " s ago" : "connecting to prices…"; }, 1000);
  }
  const liveBar = `<div class="c-livebar"><span><span class="c-livedot" aria-hidden="true"></span><b>Live</b> · prices every 10 s · new calls every 20 s</span><span class="dim" id="cAgo" aria-live="off">connecting to prices…</span></div>`;

  async function viewBoard(v) {
    v.innerHTML = skeleton;
    const { rows } = await api("leaderboard");
    const list = rows.filter((r) => state.plat === "all" || r.platform === state.plat);
    const tr = (r) => `<tr class="click" data-href="#/a/${+r.id}"><td>${r.rank ? "#" + (+r.rank) : '<span class="dim">–</span>'}</td>
      <td><span class="c-acct">${plat(r.platform)}<a href="#/a/${+r.id}" style="color:inherit;text-decoration:none"><b>${esc(r.platform === "x" ? "@" + r.handle : r.name || r.handle)}</b></a></span></td>
      <td><span class="c-score ${r.score >= 55 ? "hi" : r.score < 45 ? "lo" : ""}">${num(r.score, 1)}</span></td><td>${+r.scored} <span class="dim">/ ${+r.calls}</span></td>
      <td>${r.scored ? pct(r.wins / r.scored) : "–"}</td><td>${fx(r.med_peak)}</td><td>${fx(r.avg_24h)}</td><td>${pct(r.hold)}</td><td class="${r.dumps + r.rugs ? "down" : "dim"}">${+r.dumps + +r.rugs}</td><td class="dim">${r.last_call ? esc(ago(r.last_call)) : "–"}</td></tr>`;
    const ranked = list.filter((r) => r.rank), rest = list.filter((r) => !r.rank);
    v.innerHTML = chips() + (list.length ? `<div class="c-tablewrap"><table class="c-table"><thead><tr><th>Rank</th><th>Account</th><th>Score</th><th>Scored calls</th><th>Win rate</th><th>Median peak</th><th>Avg at 24 h</th><th>Time above entry</th><th>Dumps + rugs</th><th>Last call</th></tr></thead><tbody>
      ${ranked.map(tr).join("")}${rest.length ? `<tr><td class="sep" colspan="10">Not ranked yet: fewer than 5 scored calls</td></tr>` + rest.map(tr).join("") : ""}</tbody></table></div>
      <p class="c-fine">Score runs from 0 to 100 over the last 90 days; 50 is neutral. A win is a call whose blended 1 h, 6 h and 24 h return is at least 1.2× while the price stayed above entry at least 40% of the time. Accounts that stay under 42 after 8 scored calls are dropped. Data, not advice.</p>`
      : `<div class="c-empty"><b>No accounts with calls yet</b>Accounts appear here as soon as their first call is measured.</div>`);
  }
  async function viewCalls(v) {
    v.innerHTML = skeleton;
    const get = () => api("calls", { limit: 120 }).then((r) => r.rows);
    model.calls = await get(); model.open = null; model.allPlat = false;
    v.innerHTML = liveBar + `<div class="c-sum" id="cSum">${summary()}</div><div class="c-toolbar">${chips()}<div class="c-filters" id="cTools" role="group" aria-label="Sort and filter"></div></div><div class="c-calls" id="cList"></div>
      <p class="c-fine">Multiples compare the price with the entry price in the minute of the call. Risk is the share of that account's finished calls that were below entry after 24 hours; “~” marks accounts with fewer than 5 finished calls, where the figure is the average of all accounts. Select a call for its chart, odds and full breakdown.</p>`;
    renderCalls(); startLive(get);
  }
  function lineChart(vals) {
    if (vals.length < 2) return "";
    const W = 860, H = 120, lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), X = (i) => 8 + i / (vals.length - 1) * (W - 16), Y = (v) => 10 + (1 - (v - lo) / ((hi - lo) || 1)) * (H - 20);
    const last = vals[vals.length - 1], col = last >= 0 ? "#1CE39B" : "#FF8FA8";
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative points over time, now ${last.toFixed(1)}"><line x1="8" x2="${W - 8}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="entry"/><path d="${vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="2"/><circle cx="${X(vals.length - 1).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="4" fill="${col}"/></svg>`;
  }
  async function viewAccount(v, id) {
    v.innerHTML = skeleton;
    const get = () => api("source", { id }).then((r) => r.source);
    const s = await get(), a = s.analysis || {}, o = a.outcomes || {};
    model.calls = s.call_list || []; model.open = null;
    const tile = (l, val) => `<div class="c-stat"><b>${val}</b><span>${l}</span></div>`;
    const origin = s.origin === "early_caller" ? " · found because it posted a contract before a tracked account did" : s.origin ? ` · pump.fun leaderboard #${+s.origin_rank} (${s.origin === "pump_alltime" ? "all time" : "PnL board"}, snapshot 14 Nov 2026)${s.wallet ? ` · wallet <a href="https://solscan.io/account/${encodeURIComponent(s.wallet)}" target="_blank" rel="noopener nofollow">${esc(short(s.wallet))}</a>` : ""}` : "";
    const tot = ["moon", "win", "flat", "dump", "rug"].reduce((n, k) => n + (+o[k] || 0), 0);
    const bar = tot ? `<div class="c-obar" role="img" aria-label="Results: ${["moon", "win", "flat", "dump", "rug"].map((k) => (o[k] || 0) + " " + k).join(", ")}">${["moon", "win", "flat", "dump", "rug"].filter((k) => o[k]).map((k) => `<span class="${k}" style="flex:${+o[k]}">${+o[k]} ${k}</span>`).join("")}</div>` : "";
    const scored = model.calls.filter((c) => c.points != null).slice().sort((x, y) => new Date(x.posted_at) - new Date(y.posted_at));
    let run = 0; const cum = scored.map((c) => (run += +c.points));
    const chains = Object.entries(a.chains || {}).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${esc(CHAIN[k] || k)} ${+n}`).join(" · ");
    v.innerHTML = `<p class="c-fine" style="margin:0 0 4px"><a href="#/board">← Leaderboard</a></p>
      <div class="c-phead"><div><h2>${esc(s.platform === "x" ? "@" + s.handle : s.name || s.handle)}</h2><p>${s.platform === "x" ? "X" : "Telegram"}${s.followers ? " · " + num(s.followers) + " followers" : ""} · <a href="${esc(srcUrl(s))}" target="_blank" rel="noopener nofollow">Open ${s.platform === "x" ? "profile" : "channel"}</a>${origin}</p>${s.active === false ? `<p class="down">No longer tracked: ${esc(s.dropped_reason || "dropped")}.</p>` : ""}</div>
      <span class="c-score ${s.score >= 55 ? "hi" : s.score < 45 ? "lo" : ""}" style="font-size:22px;padding:8px 14px">${s.score == null ? "–" : num(s.score, 1)}</span></div>
      <div class="c-tiles">${tile("Rank", s.rank ? "#" + (+s.rank) : "–")}${tile("Scored calls", (+s.scored || 0) + " / " + (+s.calls || 0))}${tile("Win rate", s.scored ? pct(s.wins / s.scored) : "–")}${tile("Median peak", s.med_peak == null ? "–" : (+s.med_peak).toFixed(2) + "×")}${tile("Avg at 24 h", s.avg_24h == null ? "–" : (+s.avg_24h).toFixed(2) + "×")}${tile("Time above entry", pct(s.hold))}
        ${tile("Avg time to peak", esc(dur(a.avg_secs_to_peak)))}${tile("Avg deepest drop", a.avg_dd == null ? "–" : Math.round(a.avg_dd * 100) + "%")}${tile("Halved in 1st hour", (+a.fast_dumps || 0) + (s.scored ? " of " + s.scored : ""))}${tile("Best peak", a.best_peak == null ? "–" : (+a.best_peak).toFixed(2) + "×")}${tile("Worst at 24 h", a.worst_24h == null ? "–" : (+a.worst_24h).toFixed(2) + "×")}${tile("Calls, last 7 days", +a.calls_7d || 0)}</div>
      ${bar}${oddsCard(s.odds, esc(s.platform === "x" ? "@" + s.handle : s.name || s.handle))}${cum.length > 1 ? `<div class="c-chartbox"><div class="c-charthead"><b>Cumulative points</b><span class="dim">${cum.length} scored calls, oldest to newest</span></div><div class="c-chart">${lineChart(cum)}</div></div>` : ""}
      ${chains ? `<p class="c-fine" style="margin:0 0 14px">Chains: ${chains}</p>` : ""}
      ${liveBar}${model.calls.length ? `<div class="c-toolbar"><span></span><div class="c-filters" id="cTools" role="group" aria-label="Sort and filter"></div></div><div class="c-calls" id="cList"></div>` : `<div class="c-empty"><b>No measured calls yet</b>This account has not posted a contract address since tracking started.</div>`}`;
    model.allPlat = true; renderCalls();
    startLive(() => get().then((x) => x.call_list || []));
  }

  // ---------- routing ----------
  async function route() {
    clearInterval(state.timer); clearInterval(state.t2); clearInterval(state.t3);
    const me = state.me, land = $("#cLanding"), app = $("#cApp"), h = location.hash || "";
    const wantsJoin = h === "#/join" || h === "#join";
    if (!me || !me.member || wantsJoin) {
      land.hidden = false; app.hidden = true; renderJoin();
      if (wantsJoin) $("#join").scrollIntoView({ block: "start" });
      return;
    }
    land.hidden = true; app.hidden = false;
    const m = h.match(/^#\/a\/(\d+)$/), tab = m ? "" : h === "#/calls" ? "calls" : "board";
    $("#cWho").innerHTML = `${me.admin ? "Admin" : "Member until " + esc(day(me.paid_until))} · <b>${esc(short(me.wallet))}</b> <a class="c-btn sm" href="#/join">${me.admin ? "Membership" : "Renew"}</a> <button class="c-btn sm" data-do="signout">Sign out</button>`;
    document.querySelectorAll(".c-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const v = $("#cView");
    try {
      if (m) await viewAccount(v, +m[1]);
      else if (tab === "calls") await viewCalls(v);
      else await viewBoard(v);
    } catch (e) {
      if (e.status === 402 || e.status === 401) { state.me = e.data && e.data.me || null; return route(); }
      v.innerHTML = failed(e);
    }
  }
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".c-tab"), row = e.target.closest("tr[data-href]");
    if (tab) location.hash = tab.dataset.tab === "calls" ? "#/calls" : "#/board";
    else if (row && !e.target.closest("a,button")) location.hash = row.dataset.href;
  });
  window.addEventListener("hashchange", route);

  (async () => {
    renderJoin(); loadPublic();
    if (state.token) { try { state.me = (await api("me")).me; } catch { /* signed out */ } }
    await route();
    const pending = LS.get("dkc_pending");
    if (pending && state.me && !state.me.member) act(() => confirmPayment(pending));
  })();
})();
