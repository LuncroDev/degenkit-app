#!/usr/bin/env python3
"""DegenKit docs builder. Reads docs-src/pages/*.md and writes static pages into /docs.
Reuses the blog builder's safe markdown renderer. Usage: python3 docs-src/build.py"""
import importlib.util, pathlib, re, shutil, json, html, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("blogbuild", ROOT / "blog-src" / "build.py")
B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
SITE = B.SITE; esc = B.esc
SRC = ROOT / "docs-src" / "pages"; OUT = ROOT / "docs"
SECTIONS = [("start", "🚀 Getting started"), ("solana", "◎ Solana tools"), ("evm", "⬡ EVM tools"), ("ref", "📚 Reference")]

def load():
    pages = []
    for f in sorted(SRC.glob("*.md")):
        t = f.read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
        meta = dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M))
        meta = {k: v.strip().strip('"') for k, v in meta.items()}
        meta["order"] = int(meta["order"]); meta["body"] = m.group(2)
        pages.append(meta)
    order = [s for s, _ in SECTIONS]
    pages.sort(key=lambda p: (order.index(p["section"]), p["order"]))
    return pages

def url(p): return "/docs/" if p["slug"] == "welcome" else "/docs/%s/" % p["slug"]

def sidebar(pages, cur):
    out = ['<div class="d-search"><input id="dSearch" type="search" placeholder="🔎 Search docs…" aria-label="Search docs"></div>']
    for sid, label in SECTIONS:
        items = "".join('<a href="%s"%s>%s %s</a>' % (url(p), ' class="on" aria-current="page"' if p["slug"] == cur else "", esc(p["emoji"]), esc(p["title"])) for p in pages if p["section"] == sid)
        out.append('<div class="d-sec"><h4>%s</h4>%s</div>' % (esc(label), items))
    return "\n".join(out)

CSS_LINK = '<link rel="stylesheet" href="/assets/docs.css">'
JS = """<script>
(function(){var i=document.getElementById('dSearch');if(!i)return;
i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();
document.querySelectorAll('.d-nav a').forEach(function(a){a.style.display=(!q||a.textContent.toLowerCase().indexOf(q)>-1)?'':'none';});
document.querySelectorAll('.d-sec').forEach(function(s){var v=[].some.call(s.querySelectorAll('a'),function(a){return a.style.display!=='none'});s.style.display=v?'':'none';});});})();
</script>"""

def build_page(p, pages):
    body_html, toc = B.render(p["body"])
    idx = pages.index(p); prev = pages[idx - 1] if idx > 0 else None; nxt = pages[idx + 1] if idx + 1 < len(pages) else None
    sec_label = dict(SECTIONS)[p["section"]]
    toc_html = ""
    if len(toc) >= 3:
        toc_html = '<aside class="d-toc"><h5>On this page</h5>%s</aside>' % "".join('<a href="#%s">%s</a>' % (esc(i), esc(re.sub(r"^[^\w]+\s*", "", t))) for i, t in toc)
    pn = '<div class="d-pn">%s%s</div>' % (
        ('<a class="prev" href="%s"><span>← Previous</span>%s %s</a>' % (url(prev), esc(prev["emoji"]), esc(prev["title"]))) if prev else "<span></span>",
        ('<a class="next" href="%s"><span>Next →</span>%s %s</a>' % (url(nxt), esc(nxt["emoji"]), esc(nxt["title"]))) if nxt else "")
    canon = SITE + url(p)
    ld = json.dumps([
        {"@context": "https://schema.org", "@type": "TechArticle", "headline": p["title"], "description": p["desc"], "url": canon,
         "inLanguage": "en", "author": {"@type": "Organization", "name": "DegenKit"}, "publisher": {"@id": SITE + "/#org"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "DegenKit", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Docs", "item": SITE + "/docs/"}] + ([{"@type": "ListItem", "position": 3, "name": p["title"], "item": canon}] if p["slug"] != "welcome" else [])}
    ], ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    body = f"""<div class="d-wrap">
<button class="d-toggle" type="button" onclick="document.body.classList.toggle('d-open')">☰ Docs menu</button>
<nav class="d-nav" aria-label="Docs">
{sidebar(pages, p["slug"])}
</nav>
<main class="d-main">
<div class="d-crumb"><a href="/docs/">Docs</a> › {esc(sec_label)}</div>
<h1 class="d-h1"><span class="d-emoji">{esc(p["emoji"])}</span> {esc(p["title"])}</h1>
<p class="d-lead">{esc(p["desc"])}</p>
<article class="prose">
{body_html}
</article>
{pn}
<div class="d-help">💬 Something unclear or missing? Email <a href="mailto:support@degenkit.app">support@degenkit.app</a> and we'll improve this page.</div>
</main>
{toc_html}
</div>
{JS}"""
    html_page = B.page(p["title"] + " | DegenKit Docs", p["desc"], canon, body, og_type="article", jsonld='<script type="application/ld+json">%s</script>' % ld, extra_meta=CSS_LINK)
    html_page = html_page.replace('<link rel="alternate" type="application/rss+xml" title="DegenKit Blog" href="/blog/rss.xml">\n', "")
    d = OUT if p["slug"] == "welcome" else OUT / p["slug"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(html_page, encoding="utf-8")

def update_sitemap(pages):
    sm = ROOT / "sitemap.xml"
    if not sm.exists(): return
    s = sm.read_text(encoding="utf-8")
    s = re.sub(r"[ \t]*<url><loc>[^<]*/docs/[^<]*</loc>.*?</url>\n?", "", s)
    today = datetime.date.today().isoformat()
    s = s.replace("</urlset>", "".join(f'  <url><loc>{SITE}{url(p)}</loc><lastmod>{today}</lastmod><priority>{"0.8" if p["slug"] == "welcome" else "0.6"}</priority></url>\n' for p in pages) + "</urlset>")
    sm.write_text(s, encoding="utf-8")

def main():
    pages = load()
    shutil.rmtree(OUT, ignore_errors=True); OUT.mkdir()
    for p in pages: build_page(p, pages)
    update_sitemap(pages)
    print("built %d docs pages" % len(pages))

if __name__ == "__main__": main()
