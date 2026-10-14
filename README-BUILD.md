# How the tool pages are built

`index.html` is the TEMPLATE for the front page AND for all 26 tool pages
(resize-image-to-413x531, compress-pdf, merge-pdf ...).

Shared files (edit once, everything follows):
- `assets/site.css`   front-page design (was inline in index.html)
- `assets/tools.js`   the tool application (was inline in index.html and in 27 pages)

To change the design or a tool:
1. Edit `index.html`, `assets/site.css` or `assets/tools.js`.
2. Run `python3 build.py`  -> regenerates the 26 tool pages from index.html.

Per-page SEO/article data: `assets/tools-data.json` (title, description, canonical, JSON-LD,
H1, intro, related tools) and `articles/<slug>.html` (the text below the tool).
Edit those to change a page's SEO text; then run build.py.

The previous version of the tool pages is NOT kept in this project (it is in your original LovePDFi-compress-fixed.zip).
