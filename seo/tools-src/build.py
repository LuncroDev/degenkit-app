#!/usr/bin/env python3
"""DegenKit free tools builder. Writes static tool pages into /tools using the blog page shell.
Pages: /tools/, /tools/robinhood-chain-rpc/, /tools/token-approval-checker/.
Usage: python3 tools-src/build.py   (also updates sitemap.xml)"""
import importlib.util, pathlib, re, json, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("blogbuild", ROOT / "blog-src" / "build.py")
B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
SITE = B.SITE; esc = B.esc
OUT = ROOT / "tools"
SRC = pathlib.Path(__file__).resolve().parent

CSS = '<link rel="stylesheet" href="/tools/tools.css">'

def ld(*objs):
    return "".join('<script type="application/ld+json">%s</script>' % json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") for o in objs)

def crumbs(name, url):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "DegenKit", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Free tools", "item": SITE + "/tools/"},
        {"@type": "ListItem", "position": 3, "name": name, "item": SITE + url}]}

def faq_ld(qa):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]}

def faq_html(qa):
    return '<section class="t-sec"><h2>Questions people ask</h2>' + "".join(
        '<details class="t-faq"><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in qa) + "</section>"

def app_ld(name, url, desc):
    return {"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": SITE + url,
            "applicationCategory": "DeveloperApplication", "operatingSystem": "Any (web browser)", "description": desc,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "publisher": {"@id": SITE + "/#org"}}

def write(rel, title, desc, body, jsonld):
    html = B.page(title, desc, SITE + rel, body, jsonld=jsonld, extra_meta=CSS)
    html = html.replace('<link rel="alternate" type="application/rss+xml" title="DegenKit Blog" href="/blog/rss.xml">\n', "")
    d = ROOT / rel.strip("/")
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(html, encoding="utf-8")

# ---------------------------------------------------------------- Robinhood Chain RPC
RH_QA = [
    ("What is the Robinhood Chain RPC URL?", "The public mainnet RPC is https://rpc.mainnet.chain.robinhood.com with chain ID 4663. The public testnet RPC is https://rpc.testnet.chain.robinhood.com with chain ID 46630."),
    ("Is the public Robinhood Chain RPC free?", "Yes, but Robinhood describes its public endpoints as rate-limited and not recommended for production. For apps, bots or indexers, use a provider such as Alchemy, QuickNode, Chainstack, dRPC or your own node."),
    ("What is Robinhood Chain's chain ID?", "Mainnet is 4663 (0x1237). Testnet is 46630."),
    ("What currency pays gas on Robinhood Chain?", "ETH on Robinhood Chain. ETH on Ethereum mainnet has to be bridged first."),
    ("Is there a public WebSocket RPC?", "Robinhood's docs list WebSocket endpoints through providers such as Alchemy. The public wss addresses are sequencer feeds for nodes, not a general WebSocket RPC."),
]

def rh_page():
    rows = [("Network name", "Robinhood Chain", "Robinhood Chain Testnet"),
            ("RPC URL (public)", "https://rpc.mainnet.chain.robinhood.com", "https://rpc.testnet.chain.robinhood.com"),
            ("Chain ID", "4663", "46630"),
            ("Chain ID (hex)", "0x1237", "0xb626"),
            ("Currency symbol", "ETH", "ETH"),
            ("Block explorer", "https://robinhoodchain.blockscout.com", "https://explorer.testnet.chain.robinhood.com"),
            ("Sequencer feed (for nodes)", "wss://feed.mainnet.chain.robinhood.com", "wss://feed.testnet.chain.robinhood.com")]
    tr = "".join('<tr><th scope="row">%s</th><td><code>%s</code><button class="t-copy" type="button" data-copy="%s" aria-label="Copy %s mainnet">Copy</button></td><td><code>%s</code><button class="t-copy" type="button" data-copy="%s" aria-label="Copy %s testnet">Copy</button></td></tr>'
                 % (esc(k), esc(m), esc(m), esc(k), esc(t), esc(t), esc(k)) for k, m, t in rows)
    providers = [("Public (Robinhood)", "https://rpc.mainnet.chain.robinhood.com", "Free, rate-limited. Good for wallets and testing."),
                 ("Alchemy", "https://robinhood-mainnet.g.alchemy.com/v2/{API_KEY}", "HTTP and WebSocket. Listed first in Robinhood's docs."),
                 ("Chainstack", "https://robinhood-mainnet.core.chainstack.com/{ENDPOINT}", "Managed or self-hosted nodes."),
                 ("QuickNode", "https://{ENDPOINT}.robinhood-mainnet.quiknode.pro/{TOKEN}", "Managed endpoints."),
                 ("Also listed", "Blockdaemon · dRPC · Validation Cloud · GlobalStake · Pinax", "See Robinhood's connecting page for details."),
                 ("Your own node", "http://localhost:8547", "Arbitrum Nitro full node. See our node guide.")]
    pv = "".join('<tr><th scope="row">%s</th><td><code>%s</code></td><td>%s</td></tr>' % (esc(a), esc(b), esc(c)) for a, b, c in providers)
    body = f"""<main class="t-wrap">
<div class="t-crumb"><a href="/tools/">Free tools</a> › Robinhood Chain RPC</div>
<h1 class="t-h1">Robinhood Chain RPC</h1>
<p class="t-lead">Every endpoint and network value you need to connect to Robinhood Chain, with a live check of the public RPC and one-click buttons to add the network to your wallet.</p>

<section class="t-card t-status" aria-live="polite">
  <div class="t-status-row"><span class="t-dot" id="rhDot"></span><strong id="rhState">Checking the public mainnet RPC…</strong></div>
  <div class="t-stats">
    <div><span>Chain ID reported</span><b id="rhChain">—</b></div>
    <div><span>Latest block</span><b id="rhBlock">—</b></div>
    <div><span>Response time</span><b id="rhMs">—</b></div>
  </div>
  <div class="t-actions">
    <button class="t-btn" type="button" id="addMain">Add Robinhood Chain to wallet</button>
    <button class="t-btn ghost" type="button" id="addTest">Add testnet</button>
    <button class="t-btn ghost" type="button" id="recheck">Re-check</button>
  </div>
  <p class="t-msg" id="rhMsg"></p>
</section>

<section class="t-sec">
<h2>Network details</h2>
<div class="t-tablewrap"><table class="t-table"><thead><tr><th></th><th>Mainnet</th><th>Testnet</th></tr></thead><tbody>{tr}</tbody></table></div>
<p class="t-note">Values from Robinhood's <a href="https://docs.robinhood.com/chain/connecting" target="_blank" rel="noopener">connecting guide</a>. The public endpoints are rate-limited and not recommended for production use.</p>
</section>

<section class="t-sec">
<h2>RPC providers</h2>
<div class="t-tablewrap"><table class="t-table"><thead><tr><th>Provider</th><th>Mainnet endpoint</th><th>Notes</th></tr></thead><tbody>{pv}</tbody></table></div>
</section>

<section class="t-sec">
<h2>Test the RPC yourself</h2>
<p>Ask the endpoint for its chain ID. A healthy mainnet RPC answers <code>0x1237</code> (4663).</p>
<pre><code>curl -s https://rpc.mainnet.chain.robinhood.com \\
  -H 'content-type: application/json' \\
  -d '{{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}}'</code></pre>
</section>

<section class="t-sec t-links">
<h2>Related</h2>
<a href="/blog/robinhood-chain-rpc/">Robinhood Chain RPC explained →</a>
<a href="/blog/run-a-robinhood-chain-node/">How to run a Robinhood Chain node →</a>
<a href="/blog/robinhood-chain-token-guide/">Launch a token on Robinhood Chain →</a>
<a href="/launch/robinhood/">Open the Robinhood Chain launcher →</a>
</section>
{faq_html(RH_QA)}
</main>
<script src="/tools/rh-rpc.js" defer></script>"""
    write("/tools/robinhood-chain-rpc/", "Robinhood Chain RPC: Endpoints, Chain ID 4663 & Live Status | DegenKit",
          "Robinhood Chain RPC URLs for mainnet and testnet, chain ID 4663, explorer and providers. Live status check and one-click add to MetaMask.",
          body, ld(app_ld("Robinhood Chain RPC checker", "/tools/robinhood-chain-rpc/", "Robinhood Chain network details, live RPC status and add-to-wallet buttons."), crumbs("Robinhood Chain RPC", "/tools/robinhood-chain-rpc/"), faq_ld(RH_QA)))

# ---------------------------------------------------------------- Token approval checker
AP_QA = [
    ("What does a token approval checker do?", "It lists the contracts your wallet has allowed to spend its ERC-20 tokens, shows how much each may still spend, and lets you revoke the ones you no longer need."),
    ("Does checking approvals cost anything?", "No. Checking only reads public data and needs no wallet connection. Revoking is a transaction, so it costs network gas."),
    ("What does revoking do?", "Revoking sets the allowance for that spender to zero. It does not move any tokens and does not undo past transfers."),
    ("Which networks are supported?", "Full wallet scans work on Ethereum and Robinhood Chain. On Base and BNB Chain you can check a specific token against common spenders or any spender address you enter."),
    ("Can DegenKit move my tokens?", "No. The checker never asks for your keys. A revoke only happens when you sign it in your own wallet."),
]

def ap_page():
    body = f"""<main class="t-wrap">
<div class="t-crumb"><a href="/tools/">Free tools</a> › Token approval checker</div>
<h1 class="t-h1">Token approval checker</h1>
<p class="t-lead">See which contracts can spend your ERC-20 tokens, how much they can still take, and revoke the ones you don’t use. Free, read-only until you choose to revoke.</p>

<section class="t-card">
  <div class="t-form">
    <label>Network
      <select id="apNet">
        <option value="ethereum">Ethereum</option>
        <option value="robinhood">Robinhood Chain</option>
        <option value="base">Base</option>
        <option value="bnb">BNB Chain</option>
      </select>
    </label>
    <label class="grow">Wallet address
      <input id="apAddr" type="text" placeholder="0x…" autocomplete="off" spellcheck="false">
    </label>
  </div>
  <div class="t-actions">
    <button class="t-btn" type="button" id="apScan">Check approvals</button>
    <button class="t-btn ghost" type="button" id="apConnect">Use my wallet</button>
  </div>
  <div class="t-manual" id="apManual" hidden>
    <p class="t-note" id="apManualNote"></p>
    <div class="t-form">
      <label class="grow">Token contract address<input id="apToken" type="text" placeholder="0x… token you hold" autocomplete="off" spellcheck="false"></label>
      <label class="grow">Extra spender (optional)<input id="apSpender" type="text" placeholder="0x… router or contract" autocomplete="off" spellcheck="false"></label>
    </div>
  </div>
  <p class="t-msg" id="apMsg" aria-live="polite"></p>
</section>

<section class="t-sec" id="apResults" hidden>
  <h2 id="apTitle">Approvals</h2>
  <div class="t-tablewrap"><table class="t-table t-ap"><thead><tr><th>Token</th><th>Spender</th><th>Allowance</th><th></th></tr></thead><tbody id="apRows"></tbody></table></div>
  <p class="t-note">“Unlimited” means the spender can move any amount of that token from this wallet. Revoking sets the allowance to 0 and costs gas.</p>
</section>

<section class="t-sec">
<h2>How it works</h2>
<ol class="t-steps">
<li><b>Find past approvals.</b> On Ethereum and Robinhood Chain the checker reads your wallet’s <code>Approval</code> events from a block explorer API.</li>
<li><b>Read the current allowance.</b> For every token and spender pair it calls <code>allowance(owner, spender)</code> on the token contract, so used-up or revoked approvals drop out.</li>
<li><b>Revoke if you want.</b> Connect the wallet that owns the tokens and sign <code>approve(spender, 0)</code>. Nothing happens without your signature.</li>
</ol>
</section>

<section class="t-sec t-links">
<h2>Related</h2>
<a href="/blog/token-approval-checker-guide/">How to check and revoke token approvals →</a>
<a href="/blog/erc20-token-approvals-explained/">Token approvals explained →</a>
<a href="/blog/wallet-security-for-token-creators/">Wallet security for token creators →</a>
</section>
{faq_html(AP_QA)}
</main>
<script type="module" src="/tools/approvals.js"></script>"""
    write("/tools/token-approval-checker/", "Token Approval Checker: Find & Revoke ERC-20 Approvals | DegenKit",
          "Free token approval checker for Ethereum, Robinhood Chain, Base and BNB Chain. See which contracts can spend your tokens and revoke unlimited approvals.",
          body, ld(app_ld("Token approval checker", "/tools/token-approval-checker/", "Find and revoke ERC-20 token approvals on Ethereum, Robinhood Chain, Base and BNB Chain."), crumbs("Token approval checker", "/tools/token-approval-checker/"), faq_ld(AP_QA)))

def index_page():
    cards = [("/tools/token-approval-checker/", "🛡️", "Token approval checker", "Find and revoke ERC-20 approvals on Ethereum, Robinhood Chain, Base and BNB Chain."),
             ("/tools/robinhood-chain-rpc/", "📡", "Robinhood Chain RPC", "Endpoints, chain ID 4663, live status and add-to-wallet buttons."),
             ("/launch/solana/", "⇉", "Solana Multisender", "Send different amounts of a token to many wallets, in batches of eight."),
             ("/launch/solana/", "◈", "Solana token scanner", "Check authorities, metadata and holder concentration for any mint.")]
    c = "".join('<a class="t-tile" href="%s"><span class="t-ic">%s</span><b>%s</b><span>%s</span></a>' % (u, i, esc(t), esc(d)) for u, i, t, d in cards)
    body = f"""<main class="t-wrap">
<h1 class="t-h1">Free crypto tools</h1>
<p class="t-lead">Small, free, non-custodial tools from DegenKit. No sign-up, and nothing is signed unless you choose to.</p>
<div class="t-grid">{c}</div>
</main>"""
    write("/tools/", "Free Crypto Tools: Approval Checker, Robinhood Chain RPC & More | DegenKit",
          "Free non-custodial tools: token approval checker, Robinhood Chain RPC details and status, Solana multisender and token scanner.", body,
          ld({"@context": "https://schema.org", "@type": "CollectionPage", "name": "DegenKit free tools", "url": SITE + "/tools/"}))

def update_sitemap():
    sm = ROOT / "sitemap.xml"
    if not sm.exists(): return
    s = sm.read_text(encoding="utf-8")
    s = re.sub(r"[ \t]*<url><loc>[^<]*/tools/[^<]*</loc>.*?</url>\n?", "", s)
    today = datetime.date.today().isoformat()
    urls = ["/tools/", "/tools/token-approval-checker/", "/tools/robinhood-chain-rpc/"]
    s = s.replace("</urlset>", "".join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod><priority>{"0.6" if u == "/tools/" else "0.8"}</priority></url>\n' for u in urls) + "</urlset>")
    sm.write_text(s, encoding="utf-8")

def main():
    OUT.mkdir(exist_ok=True)
    for f in ("tools.css", "rh-rpc.js", "approvals.js"):
        (OUT / f).write_text((SRC / f).read_text(encoding="utf-8"), encoding="utf-8")
    index_page(); rh_page(); ap_page(); update_sitemap()
    print("built 3 tool pages")

if __name__ == "__main__": main()
