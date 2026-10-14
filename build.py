#!/usr/bin/env python3
"""Regenerate every standalone tool page from index.html.

Run from the project folder:   python3 build.py

index.html is the TEMPLATE. Edit the front-page design/tools there (and in assets/site.css, assets/tools.js);
then run this script and all 26 tool pages pick the change up. Per-page SEO data lives in
assets/tools-data.json (+ articles/<slug>.html). Each page keeps its own URL, title, description,
canonical, JSON-LD and article, so Google ranking is unaffected.
"""
import json, re, html, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
T = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
DATA = json.load(open(os.path.join(ROOT, 'assets', 'tools-data.json'), encoding='utf-8'))
TOOLS, CARDS = DATA['tools'], DATA['cards']

def sub1(pat, repl, s, flags=re.S):
    new, n = re.subn(pat, lambda m: repl, s, count=1, flags=flags)
    if n != 1:
        sys.exit('template anchor not found: ' + pat)
    return new

def related_html(slug):
    cards = []
    for r in TOOLS[slug]['related']:
        ico, title, desc = CARDS.get(r) or ('🛠️', html.unescape(re.sub('<[^>]+>', '', TOOLS[r]['h1'])), TOOLS[r]['description'])
        cards.append('<a class="atl-card" href="./%s" data-nav="1"><span class="atl-ico" aria-hidden="true">%s</span><h3>%s</h3><p>%s</p></a>' % (r, ico, title, desc))
    return ('<section class="atl" id="relatedTools" aria-labelledby="rel-h"><h2 id="rel-h">Related tools</h2>'
            '<div class="atl-grid">%s</div></section>' % '\n'.join(cards))

def build(slug):
    d = TOOLS[slug]
    page = T
    # 1. SEO head: remove the front page's, insert this page's own
    for pat in [r'<title>.*?</title>\n?', r'<meta name="description"[^>]*>\n?', r'<link rel="canonical"[^>]*>\n?',
                r'<meta name="robots"[^>]*>\n?', r'<meta property="og:[^>]*>\n?', r'<meta name="twitter:[^>]*>\n?',
                r'<script type="application/ld\+json">.*?</script>\n?']:
        page = re.sub(pat, '', page, flags=re.S)
    page = sub1(r'<meta charset="utf-8">\n?', '<meta charset="utf-8">\n' + '\n'.join(d['seoHead']) + '\n', page)
    # 2. body attributes: which tool to open
    attrs = ' data-shared-app="1"' + ''.join(' %s="%s"' % (k, v) for k, v in d['bodyAttrs'].items()) + ' data-tool="%s"' % slug
    page = sub1(r'<body[^>]*>', '<body%s>' % attrs, page)
    # 3. hero: headline + intro (drop the front page's generic subtitle)
    page = sub1(r'<h1 id="toolHeadline">.*?</h1>', '<h1 id="toolHeadline">%s</h1>' % d['h1'], page)
    page = re.sub(r'<p class="sub" style="text-align:center;margin:8px 0 0">.*?</p>\n?', '', page, count=1, flags=re.S)
    page = sub1(r'<p class="intro">.*?</p>', '<p class="intro">%s</p>' % d['intro'], page)
    # 4. below the tool: this page's article + related tools (static HTML, so Google reads it)
    article = open(os.path.join(ROOT, d['articleFile']), encoding='utf-8').read().strip()
    block = '<div id="toolArticle">\n%s\n</div>\n%s\n' % (article, related_html(slug))
    page = sub1(r'<!--TOOL-CONTENT:start.*?<!--TOOL-CONTENT:end-->', block, page)
    open(os.path.join(ROOT, d['file']), 'w', encoding='utf-8').write(page)

for slug in TOOLS:
    build(slug)
print('built %d tool pages from index.html' % len(TOOLS))
