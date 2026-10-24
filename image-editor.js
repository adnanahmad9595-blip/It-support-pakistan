/* LovePDFi Image Editor
 * Loaded on demand by tools.js the first time the "Edit" tab is opened.
 * Everything runs in the browser; the photo never leaves the device.
 * Layout (matches the hand sketch): Select / Take photo / Clear -> big picture -> Rotate button -> tool grid -> tool options -> Restore / Save / Download.
 * Tools: Crop, Rotate, Flip, Text, Draw, Arrow, Rectangle, Circle, Blur, Brightness, Contrast, Watermark, Add image, Sticker.
 * Every action applies instantly and is auto-saved on this device. After Download a confirmation panel appears;
 * a storage backend can later be plugged in via window.LovePDFiStorage.save(blob, meta).
 * When window.LovePDFiGallery exists the editor uses the SHARED image gallery (same one as Compress / Resize / Convert):
 * it edits the selected gallery image and writes every change back to the gallery.
 */
(function () {
  'use strict';
  if (window.LovePDFiEditor) return;

  var MAX_SIDE = 3200;   // photos larger than this are reduced for smooth editing
  var HIST = 8;          // undo steps

  var CSS = [
    '.ie [hidden]{display:none!important}',
    '.ie-note{text-align:center;margin:0 0 12px}',
    '.ie-rotate-row{display:flex;justify-content:center;margin:8px 0 4px}',
    '.ie-rotate-row .btn{width:100%;max-width:520px;min-height:38px!important;padding:7px 12px!important;font-size:14px!important;border-radius:10px!important}',
    '.ie-toolbar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:8px 0 6px;padding:8px;background:var(--soft,#f1f5fb);border:1px solid var(--line,#e0e7f1);border-radius:12px}',
    '.ie-toolbar .chip{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;min-height:46px;padding:5px 2px!important;border-radius:10px!important;font-size:11px!important;line-height:1.15;text-align:center;white-space:normal;word-break:break-word}',
    '.ie-toolbar .ie-ti{font-size:17px;line-height:1}',
    '@media(max-width:520px){.ie-toolbar{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:6px}.ie-toolbar .chip{min-height:44px;font-size:10.5px!important}}',
    '.ie-actions{display:flex;flex-wrap:nowrap;gap:6px;justify-content:center;margin:8px 0}',
    '.ie-actions .btn,.ie-actions .btn.dl,.ie-actions .et-share{flex:1 1 0;min-width:0;max-width:none;min-height:38px!important;padding:7px 6px!important;font-size:13.5px!important;border-radius:10px!important;margin-left:0!important;white-space:nowrap}',
    '.ie-done .et-share{margin-left:0}',
    '.ie .ie-row .chip{padding:6px 12px;font-size:13px;min-height:34px}',
    '.ie-upload-actions{justify-content:center;gap:10px;flex-wrap:wrap}',
    '.ie-upload-actions .btn{min-width:145px}',
    '.ie-stagewrap{display:flex;justify-content:center;margin:10px 0}',
    '.ie-stage{background:#11151e;border-radius:16px;padding:10px;max-width:100%;box-sizing:border-box}',
    '.ie-stage canvas{display:block;max-width:100%;border-radius:6px;background:repeating-conic-gradient(#2a2f3a 0% 25%,#222733 0% 50%) 50%/16px 16px}',
    '.ie-opts{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin:8px 0}',
    '.ie-opts label{display:flex;gap:6px;align-items:center;font-size:14px}',
    '.ie-opts input[type=range]{width:min(260px,70vw)}',
    '.ie-opts input[type=color]{width:42px;height:34px;padding:0;border:1px solid #cfd6e6;border-radius:8px;background:none}',
    '.ie-opts textarea,.ie-opts input[type=text]{font:inherit;padding:8px 10px;border:1px solid #cfd6e6;border-radius:10px;min-width:min(260px,80vw)}',
    '.ie-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}',
    '.ie-hint{text-align:center;font-size:13px;color:#667085;margin:4px 0}',
    '.ie-val{min-width:3.2em;text-align:left;font-variant-numeric:tabular-nums}',
    '.ie-info{text-align:center;font-size:13px;color:#667085;margin:6px 0}',
    '.ie-toolbar .chip[aria-pressed=true]{background:#1d7be0!important;border-color:#1d7be0!important;color:#fff!important}',
    '.ie-toolbar .chip[aria-pressed=false]{background:var(--soft,#f3f5fa);color:var(--ink,#111)}',
    '.ie-sticker-grid{display:grid;grid-template-columns:repeat(6,minmax(38px,1fr));max-width:420px;margin:10px auto}',
    '.ie-sticker{font-size:25px;min-width:40px;min-height:42px;padding:4px!important}',
    '.ie-done{margin:12px auto;max-width:520px;text-align:center;padding:14px;border:1px solid #1d7be0;border-radius:14px;background:rgba(29,123,224,.08)}',
    '.ie-done strong{display:block;font-size:16px;margin-bottom:4px}',
    '.ie-auto{min-height:1.2em}',
    '.ie-top{display:none}',
    '.ie.ie-imm #ieWork{position:fixed;left:0;right:0;top:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;background:#0b1220;color:#e9eef8;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0);overflow:hidden;box-sizing:border-box}',
    '.ie.ie-imm .ie-top{display:flex;order:0;align-items:center;gap:6px;padding:8px 10px;background:#0b1220;border-bottom:1px solid #243049}',
    '.ie-top button{min-height:42px;min-width:42px;padding:0 12px;border:1px solid #2c3a57;border-radius:10px;background:#16203a;color:#fff;font:600 15px/1 inherit;cursor:pointer}',
    '.ie-top button:disabled{opacity:.4}',
    '.ie-top .ie-done-btn{background:#16a34a;border-color:#16a34a;padding:0 12px;white-space:nowrap;flex:0 0 auto}',
    '.ie-top .ie-mid{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:600;white-space:nowrap}',
    '.ie-top .ie-ttl{overflow:hidden;text-overflow:ellipsis;color:#cbd5e6}',
    '.ie-top .ie-pos{display:inline-block;min-width:3.4em;text-align:center}',
    '.ie-top .ie-grp{display:flex;gap:6px}',
    '.ie.ie-imm .ie-stagewrap{order:1;flex:1 1 auto;min-height:0;margin:0;align-items:center;overflow:hidden}',
    '.ie.ie-imm .ie-stage{padding:0;background:transparent;border-radius:0;max-width:100%;max-height:100%}',
    '.ie.ie-imm .ie-opts{order:2;flex:0 0 auto;max-height:44vh;overflow-y:auto;margin:0;padding:10px 12px;background:#111a2e;border-top:1px solid #243049;color:#e9eef8;justify-content:center}',
    '.ie.ie-imm .ie-opts .ie-hint{color:#9aa7bd}',
    '.ie.ie-imm .ie-toolbar{order:3;display:flex!important;flex-wrap:nowrap;overflow-x:auto;gap:6px;margin:0;padding:6px 8px;border-radius:0;border:0;border-top:1px solid #243049;background:#0b1220;-webkit-overflow-scrolling:touch}',
    '.ie.ie-imm .ie-toolbar .chip{flex:0 0 auto;width:66px;min-height:48px}',
    '@media (orientation:landscape) and (max-height:560px){.ie.ie-imm #ieWork{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,40%);grid-template-rows:auto minmax(0,1fr) auto}.ie.ie-imm .ie-top{grid-column:1 / span 2;grid-row:1}.ie.ie-imm .ie-stagewrap{grid-column:1;grid-row:2 / span 2}.ie.ie-imm .ie-opts{grid-column:2;grid-row:2;max-height:none;overflow-y:auto;border-top:0;border-left:1px solid #243049}.ie.ie-imm .ie-toolbar{grid-column:2;grid-row:3;border-left:1px solid #243049}}',
    '.ie-txin{position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;resize:none;pointer-events:none;font-size:16px;background:transparent;color:transparent}',
    '.ie.ie-imm.ie-typing .ie-opts,.ie.ie-imm.ie-typing .ie-toolbar{display:none!important}',
    '.ie-txbar{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 0 8px;width:100%}',
    '.ie-txbar .chip:disabled{opacity:.45}',
    '.ie-txtabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;width:100%;-webkit-overflow-scrolling:touch}',
    '.ie-txtabs .chip{flex:0 0 auto}',
    '.ie-txpane{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:center;width:100%}',
    '.ie-fonts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-height:160px;overflow-y:auto;width:100%}',
    '.ie-fontchip{display:flex!important;flex-direction:column;align-items:center;justify-content:center;min-width:78px;min-height:52px!important;padding:5px 8px!important;line-height:1.25}',
    '.ie-fontchip b{font-size:21px;font-weight:600}',
    '.ie-fontchip small{font-size:10px;opacity:.7;font-family:sans-serif}',
    '.ie-sw{width:32px;height:32px;border-radius:50%;border:2px solid #fff;padding:0;cursor:pointer;box-shadow:0 0 0 1px #64748b}',
    '.ie-sw[aria-pressed=true]{outline:3px solid #10b981;outline-offset:1px}',
    '.ie-txpane label{display:flex;align-items:center;gap:8px}',
    '.ie.ie-imm .ie-rotate-row,.ie.ie-imm #ieHistory,.ie.ie-imm .ie-actions,.ie.ie-imm .ie-done,.ie.ie-imm .ie-info,.ie.ie-imm #ieQrow,.ie.ie-imm [aria-label=\'Save as\']{display:none!important}'
  ].join('\n');

  var TOOLS = [
    ['crop', '✂ Crop'], ['flip', '⇋ Flip'], ['text', 'T Text'], ['draw', '✎ Draw'], ['arrow', '➚ Arrow'],
    ['rect', '▭ Rectangle'], ['circle', '◯ Circle'], ['blur', '▒ Blur'], ['brightness', '☀ Brightness'],
    ['contrast', '◐ Contrast'], ['watermark', '© Watermark'], ['image', '🖼 Add image'], ['sticker', '✨ Sticker']
  ];

  var TEMPLATE =
    '<div class="ie">' +
    '<p class="sub ie-note">Edit one photo: crop, rotate, flip, add text, shapes or another image, blur private details, adjust brightness and contrast, and add a watermark. Every change applies instantly and is auto-saved. Everything stays on your device.</p>' +
    '<div class="actions ie-upload-actions"><button type="button" class="btn" id="ieSel">🖼 Select Image</button><button type="button" class="btn" id="ieCam">📷 Take Photo</button></div>' +
    '<div class="ie-row" id="ieCancelRow"><button type="button" class="chip" id="ieCancel">✕ Cancel / Clear editor</button></div>' +
    '<input type="file" id="ieFile" accept="image/*,.heic,.heif" hidden>' +
    '<input type="file" id="ieCamFile" accept="image/*" capture="environment" hidden>' +
    '<div class="drop" id="ieDrop" tabindex="0" role="button" aria-label="Choose an image to edit">Or drop an image here<br><small>JPG, PNG, WebP or HEIC · one photo at a time</small></div>' +
    '<div class="ie-row" id="ieResumeRow" hidden><button type="button" class="chip" id="ieResume">↺ Resume last edit</button></div>' +
    '<p class="ie-hint" id="ieMsg" role="status" hidden></p>' +
    '<div id="ieWork" hidden>' +
    '<div class="ie-top" id="ieTop">' +
    '<button type="button" class="ie-done-btn" id="ieTopDone">✓ Done</button>' +
    '<div class="ie-mid"><span class="ie-ttl" id="ieTitle"></span>' +
    '<span id="ieNav" hidden><button type="button" id="iePrev" aria-label="Previous image">‹</button> <span class="ie-pos" id="iePos"></span> <button type="button" id="ieNext" aria-label="Next image">›</button></span></div>' +
    '<div class="ie-grp"><button type="button" id="ieTopUndo" aria-label="Undo" disabled>↶</button><button type="button" id="ieTopRedo" aria-label="Redo" disabled>↷</button><button type="button" id="ieTopRot" aria-label="Rotate">↻</button></div>' +
    '</div>' +
    '<div class="ie-stagewrap"><div class="ie-stage"><canvas id="ieCv" aria-label="Image being edited"></canvas></div></div>' +
    '<textarea class="ie-txin" id="ieTxIn" rows="1" autocomplete="off" autocapitalize="sentences" spellcheck="false" aria-label="Type your text"></textarea>' +
    '<div class="ie-rotate-row"><button type="button" class="btn" id="ieRotate">↻ Rotate</button></div>' +
    '<div class="ie-toolbar" id="ieTools" role="toolbar" aria-label="Editing tools"></div>' +
    '<div class="ie-opts" id="ieOpts"></div>' +
    '<div class="ie-row" id="ieHistory">' +
    '<button type="button" class="chip" id="ieUndo" disabled>↶ Undo</button>' +
    '<button type="button" class="chip" id="ieRedo" disabled>↷ Redo</button>' +
    '<button type="button" class="chip" id="ieReset">⟲ Restore</button>' +
    '<button type="button" class="chip" id="ieChange">⬆ Change image</button></div>' +
    '<div class="ie-row" role="group" aria-label="Save as"><span style="font-weight:500">Save as:</span><div class="seg" id="ieFmt">' +
    '<button type="button" data-f="png" aria-pressed="true">PNG</button><button type="button" data-f="jpeg" aria-pressed="false">JPG</button><button type="button" data-f="webp" aria-pressed="false">WebP</button></div></div>' +
    '<div class="ie-row" id="ieQrow" hidden><label>Quality <input type="range" id="ieQ" min="40" max="100" value="92"> <span class="ie-val" id="ieQv">92%</span></label></div>' +
    '<div class="ie-actions"><button type="button" class="btn" id="ieSaveKeep">💾 Save</button><button type="button" class="btn dl" id="ieSave">⬇ Download</button><button type="button" class="btn et-share" id="ieShare">↗ Share</button></div>' +
    '<div class="ie-done" id="ieDone" role="status" hidden><strong>✓ Download started</strong><span id="ieDoneT"></span>' +
    '<div class="ie-row"><button type="button" class="btn dl" id="ieAgain">⬇ Download again</button><button type="button" class="btn et-share" id="ieShareAgain">↗ Share</button><button type="button" class="chip" id="ieKeep">✎ Keep editing</button></div></div>' +
    '<p class="ie-info" id="ieInfo" role="status"></p>' +
    '<p class="ie-info ie-auto" id="ieAuto" role="status"></p>' +
    '</div></div>';

  function mount(root) {
    if (!root || root.dataset.ieMounted) return;
    root.dataset.ieMounted = '1';

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root.innerHTML = TEMPLATE;
    var G = window.LovePDFiGallery || null, shared = !!G;
    if (shared) {
      root.querySelector('.ie-note').textContent = 'Edit the image selected in the gallery above. Every change applies instantly and is saved back to the gallery, so Compress, Resize and Convert use the edited image.';
      root.querySelector('.actions').hidden = true;
      root.querySelector('#ieDrop').hidden = true;
      root.querySelector('#ieChange').hidden = true;
      root.querySelector('#ieCancelRow').hidden = true;   // the gallery's own Clear button is used
    }

    function $(id) { return root.querySelector('#' + id); }
    var cv = $('ieCv'), optsEl = $('ieOpts'), workEl = $('ieWork'), msgEl = $('ieMsg'), infoEl = $('ieInfo');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var autoEl = $('ieAuto'), doneEl = $('ieDone');

    // ---------------------------------------------------------------- state
    var S = { base: null, orig: null, origBlob: null, annots: [], sel: -1, adj: { b: 0, c: 0 }, wm: newWm(), name: 'photo', tool: null, itemId: null, itemType: '', loadedFile: null, loadingFile: null, writing: false };
    var P = { aspect: null, color: '#e53935', lw: 6, fill: false, text: '', textColor: '#ffffff', textSize: 7, bold: true,
              blurStyle: 'blur', blurStrength: 14, fmt: 'png', q: 92, imgSize: 40, imgOpacity: 100,
              ttab: 'font',
              ts: { f: 'sans', b: 1, i: 0, u: 0, al: 'center', c: '#ffffff', g: null, sk: 0, skc: '#000000', sh: 1, shc: '#000000', shb: 0.08, bg: '', bgc: '#000000', bga: 0.6, ls: 0, lh: 0, skw: 0, op: 100 } };
    var hist = [], redo = [], autoDirty = false, saveT = null, IMGS = {}, imgSeq = 0;
    var crop = null, drag = null, tmp = null, blurRect = null, stickerCategory = 'smileys';
    var K = 1, CK = 1, view = null, viewKey = '', baseId = 0, optEditing = false;
    function shown() { return root.isConnected && !root.closest('[hidden]'); }   // is the Edit tab on screen? (offsetParent is null for display:contents)
    var imm = false, ieEl = root.querySelector('.ie') || root, stageEl = root.querySelector('.ie-stagewrap');
    var ptrs = {}, txEditing = false, caretOn = true, caretT = 0, txNewHist = false, pendingFocus = false;   // text tool: pointers, keyboard editing, blinking caret   // imm = the full-screen editing window

    function newWm() { return { on: false, type: 'text', text: '', color: '#ffffff', size: 8, opacity: 55, pos: 'br', img: null }; }
    function cloneWm(w) { return { on: w.on, type: w.type, text: w.text, color: w.color, size: w.size, opacity: w.opacity, pos: w.pos, img: w.img }; }
    function newCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); c._id = ++baseId; return c; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    // One single, smooth scroll (several scroll calls cancel each other in mobile browsers).
    function revealEditor() {
      var t = root.querySelector('.ie-stagewrap');
      if (!t || workEl.hidden || !shown()) return;
      var bar = document.querySelector('.bar'), hdr = (bar && bar.offsetHeight) || 64, vh = window.innerHeight;
      var top = t.getBoundingClientRect().top;
      if (imm) return;
      if (top >= hdr && top <= vh * 0.3) return;   // picture already comfortably in view
      var y = Math.max(0, window.pageYOffset + top - hdr - 12);
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { window.scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
    }
    function say(t) { msgEl.hidden = !t; msgEl.textContent = t || ''; }

    // ---------------------------------------------------------------- loading
    async function blobToCanvas(blob) {
      var url = URL.createObjectURL(blob);
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('img')); }; i.src = url; });
      var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, MAX_SIDE / Math.max(w, h));
      var c = newCanvas(w * s, h * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      return { c: c, s: s };
    }
    async function loadFile(file, draft) {
      if (!file) return;
      stopTyping();
      if (draft && draft.id && S.loadingFile === file) return;
      S.loadingFile = file;
      say('');
      try {
        if (/heic|heif/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '')) {
          if (!window.__lj) throw new Error('heic');
          say('Converting iPhone photo…');
          await window.__lj('heic');
          var out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          file = Array.isArray(out) ? out[0] : out;
          file.name = 'photo.jpg';
        }
        var r = await blobToCanvas(file), c = r.c, s = r.s;
        S.orig = c; S.origBlob = null;
        if (draft && draft.orig && draft.orig !== file) { try { S.orig = (await blobToCanvas(draft.orig)).c; S.origBlob = draft.orig; } catch (x) { S.orig = c; } }
        else if (draft && draft.orig) { S.origBlob = draft.orig; }
        else c.toBlob(function (bl) { S.origBlob = bl; }, 'image/png');
        S.base = c;
        S.annots = []; S.sel = -1; S.adj = { b: 0, c: 0 }; S.wm = newWm();
        S.name = draft ? (draft.name || 'photo') : ((file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo');
        S.itemId = (draft && draft.id) || null; S.itemType = (draft && draft.type) || ''; S.loadedFile = file; S.loadingFile = null;
        hist = []; redo = []; crop = null; tmp = null; blurRect = null; autoDirty = false;
        workEl.hidden = false;
        $('ieResumeRow').hidden = true; doneEl.hidden = true; autoEl.textContent = '';
        say(s < 1 ? 'Large photo reduced to ' + c.width + '×' + c.height + ' for smooth editing.' : '');
        setTool(imm ? S.tool : (root.dataset.startTool || null));   // a landing page can pre-select a tool (e.g. Watermark); inside the full-screen window the current tool stays
        updateNav();
        syncHist();
        infoEl.textContent = '';
        // Auto-scroll (same idea as Compress / Resize): after a picture is loaded, bring the picture and the tool panel into view.
        window.setTimeout(function () { revealEditor(); }, 160);
      } catch (e) {
        say(e && e.message === 'heic'
          ? 'This is an iPhone (HEIC) photo. Please convert it first in the “iPhone (HEIC)” tab, then edit it here.'
          : 'Could not open this image. Please try another JPG, PNG or WebP file.');
        S.loadingFile = null;
      }
    }

    // ---------------------------------------------------------------- auto-save (this device only)
    function dbOpen() {
      return new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('lovepdfi-editor', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('draft'); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        } catch (e) { rej(e); }
      });
    }
    function dbPut(v) { return dbOpen().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('draft', 'readwrite'); tx.objectStore('draft').put(v, 'last'); tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; }); }); }
    function dbGet() { return dbOpen().then(function (db) { return new Promise(function (res, rej) { var q = db.transaction('draft', 'readonly').objectStore('draft').get('last'); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }); }
    function scheduleSave() { autoEl.textContent = 'Saving…'; clearTimeout(saveT); saveT = setTimeout(autoSave, shared ? 300 : 700); }
    // Shared mode: write the edited picture back into the gallery item it came from
    function commitToGallery() {
      if (!S.itemId || !S.base) return Promise.resolve();
      var id = S.itemId, out = renderFull(S.itemType === 'image/jpeg');
      S.writing = true;
      return G.setCanvas(id, out).then(function () {
        S.writing = false;
        var c = G.current();
        if (c && c.id === id) S.loadedFile = c.f;
        autoEl.textContent = '✓ Saved to gallery';
      }).catch(function () { S.writing = false; autoEl.textContent = ''; });
    }
    function flush() {
      clearTimeout(saveT); saveT = null;
      if (shared && S.base && autoDirty) { autoDirty = false; return commitToGallery(); }
      return Promise.resolve();
    }
    function baseName(n) { return (n || 'photo').replace(/\.[^.]+$/, '') || 'photo'; }
    function syncFromGallery() {
      var c = G.current();
      if (!c) {
        S.base = null; S.orig = null; S.itemId = null; S.loadedFile = null; autoDirty = false; clearTimeout(saveT);
        workEl.hidden = true; say('Select images above to start editing.');
        return;
      }
      if (S.itemId === c.id && S.loadedFile === c.f) { if (S.base && shown()) { layout(); render(); } return; }
      var pending;
      if (S.base && autoDirty && S.itemId && S.itemId !== c.id) pending = flush();
      else { autoDirty = false; pending = Promise.resolve(); }
      pending.then(function () {
        var c2 = G.current(); if (!c2) return;
        loadFile(c2.f, { orig: c2.orig, name: baseName(c2.name), id: c2.id, type: c2.type });
      });
    }
    function autoSave() {
      saveT = null;
      if (!S.base || drag || !autoDirty) return;
      autoDirty = false;
      if (shared) { commitToGallery(); return; }
      renderFull(false).toBlob(function (b) {
        if (!b) return;
        dbPut({ cur: b, orig: S.origBlob, name: S.name, t: Date.now() })
          .then(function () { autoEl.textContent = '✓ Auto-saved on this device'; })
          .catch(function () { autoEl.textContent = ''; });
      }, 'image/png');
    }

    // ---------------------------------------------------------------- history
    function snapshot() { return { base: S.base, annots: JSON.parse(JSON.stringify(S.annots)), adj: { b: S.adj.b, c: S.adj.c }, wm: cloneWm(S.wm) }; }
    function pushHist() { hist.push(snapshot()); if (hist.length > HIST) hist.shift(); redo = []; autoDirty = true; if (doneEl) doneEl.hidden = true; syncHist(); }
    function restore(s) {
      stopTyping();
      S.base = s.base; S.annots = s.annots; S.adj = s.adj; S.wm = s.wm; S.sel = -1; crop = null; tmp = null; autoDirty = true;
      if (S.tool === 'crop') initCrop();
      layout(); render(); renderOpts(); syncHist();
    }
    function undo() { if (!hist.length) return; redo.push(snapshot()); restore(hist.pop()); }
    function redoOp() { if (!redo.length) return; hist.push(snapshot()); restore(redo.pop()); }
    function syncHist() { $('ieUndo').disabled = !hist.length; $('ieRedo').disabled = !redo.length; $('ieTopUndo').disabled = !hist.length; $('ieTopRedo').disabled = !redo.length; }
    function resetAll() {
      if (!S.orig) return;
      pushHist();
      S.base = S.orig; S.annots = []; S.sel = -1; S.adj = { b: 0, c: 0 }; S.wm = newWm(); crop = null;
      if (S.tool === 'crop') initCrop();
      layout(); render(); renderOpts();
    }

    // ---------------------------------------------------------------- layout / render
    function layout() {
      if (!S.base) return;
      var availW, availH;
      if (imm && stageEl && stageEl.clientHeight > 40) {      // full-screen window: fill the space between the top bar and the options
        availW = clamp(stageEl.clientWidth - 12, 100, 2600); availH = clamp(stageEl.clientHeight - 12, 100, 2600);
      } else {
        availW = clamp((root.clientWidth || 340) - 44, 220, 1200); availH = clamp(window.innerHeight * 0.82, 280, 980);
      }
      var s = Math.min(availW / S.base.width, availH / S.base.height, imm ? 4 : 2);
      var cssW = Math.max(40, S.base.width * s), cssH = Math.max(40, S.base.height * s);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      K = cv.width / S.base.width; CK = cssW / S.base.width;
      viewKey = '';
    }

    function applyAdj(ctx, w, h, b, c) {
      if (!b && !c) return;
      var d = ctx.getImageData(0, 0, w, h), a = d.data;
      var cc = c * 1.5, f = (259 * (cc + 255)) / (255 * (259 - cc)), off = b * 1.6;
      for (var i = 0; i < a.length; i += 4) {
        a[i] = f * (a[i] - 128) + 128 + off;
        a[i + 1] = f * (a[i + 1] - 128) + 128 + off;
        a[i + 2] = f * (a[i + 2] - 128) + 128 + off;
      }
      ctx.putImageData(d, 0, 0);
    }

    function ensureView() {
      var key = cv.width + 'x' + cv.height + '|' + S.base._id + '|' + S.adj.b + ',' + S.adj.c;
      if (key === viewKey && view) return;
      view = view || document.createElement('canvas');
      view.width = cv.width; view.height = cv.height;
      var vx = view.getContext('2d');
      vx.imageSmoothingQuality = 'high';
      vx.drawImage(S.base, 0, 0, view.width, view.height);
      applyAdj(vx, view.width, view.height, S.adj.b, S.adj.c);
      viewKey = key;
    }

    // ---------------------------------------------------------------- text engine
    // A text object: { t:'text', x, y (top-left of the unrotated box), s (font px), c, b, text,
    //   f font, i italic, u underline, al align, g [c1,c2] gradient, sk stroke (x size), skc, sh shadow 0/1, shc, shb (x size),
    //   bg box colour, bga box alpha, ls letter spacing (x size), lh line height, rot (rad), skw (deg), op (%), lock }
    // Old texts and emoji stickers have none of the new fields and keep their old look.
    var FONTS = [
      { k: 'sans', n: 'Default', css: 'sans-serif', lang: 'en', lh: 1.2 },
      { k: 'serif', n: 'Serif', css: 'Georgia,"Times New Roman",serif', lang: 'en', lh: 1.2 },
      { k: 'mono', n: 'Mono', css: '"Courier New",monospace', lang: 'en', lh: 1.2 },
      { k: 'Roboto', n: 'Roboto', g: 'Roboto', w: ':wght@400;700', css: 'Roboto,sans-serif', lang: 'en', lh: 1.2 },
      { k: 'Poppins', n: 'Poppins', g: 'Poppins', w: ':wght@400;700', css: 'Poppins,sans-serif', lang: 'en', lh: 1.25 },
      { k: 'Montserrat', n: 'Montserrat', g: 'Montserrat', w: ':wght@400;700', css: 'Montserrat,sans-serif', lang: 'en', lh: 1.2 },
      { k: 'Oswald', n: 'Oswald', g: 'Oswald', w: ':wght@400;700', css: 'Oswald,sans-serif', lang: 'en', lh: 1.2 },
      { k: 'Playfair', n: 'Playfair', g: 'Playfair Display', w: ':wght@400;700', css: '"Playfair Display",serif', lang: 'en', lh: 1.2 },
      { k: 'Bebas', n: 'Bebas Neue', g: 'Bebas Neue', w: '', css: '"Bebas Neue",sans-serif', lang: 'en', lh: 1.1 },
      { k: 'Anton', n: 'Anton', g: 'Anton', w: '', css: 'Anton,sans-serif', lang: 'en', lh: 1.15 },
      { k: 'Pacifico', n: 'Pacifico', g: 'Pacifico', w: '', css: 'Pacifico,cursive', lang: 'en', lh: 1.4 },
      { k: 'Lobster', n: 'Lobster', g: 'Lobster', w: '', css: 'Lobster,cursive', lang: 'en', lh: 1.25 },
      { k: 'Dancing', n: 'Dancing Script', g: 'Dancing Script', w: ':wght@400;700', css: '"Dancing Script",cursive', lang: 'en', lh: 1.25 },
      { k: 'Caveat', n: 'Caveat', g: 'Caveat', w: ':wght@400;700', css: 'Caveat,cursive', lang: 'en', lh: 1.15 },
      { k: 'Marker', n: 'Marker', g: 'Permanent Marker', w: '', css: '"Permanent Marker",cursive', lang: 'en', lh: 1.25 },
      { k: 'Nastaliq', n: 'Nastaliq', g: 'Noto Nastaliq Urdu', w: ':wght@400;700', css: '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq",serif', lang: 'ur', lh: 1.9 },
      { k: 'Naskh', n: 'Naskh', g: 'Noto Naskh Arabic', w: ':wght@400;700', css: '"Noto Naskh Arabic","Noto Nastaliq Urdu",serif', lang: 'ur', lh: 1.5 },
      { k: 'Amiri', n: 'Amiri', g: 'Amiri', w: ':wght@400;700', css: 'Amiri,serif', lang: 'ur', lh: 1.5 },
      { k: 'Lateef', n: 'Lateef', g: 'Lateef', w: ':wght@400;700', css: 'Lateef,serif', lang: 'ur', lh: 1.4 },
      { k: 'Ruqaa', n: 'Aref Ruqaa', g: 'Aref Ruqaa', w: ':wght@400;700', css: '"Aref Ruqaa",serif', lang: 'ur', lh: 1.5 },
      { k: 'Reem', n: 'Reem Kufi', g: 'Reem Kufi', w: ':wght@400;700', css: '"Reem Kufi",sans-serif', lang: 'ur', lh: 1.3 },
      { k: 'Cairo', n: 'Cairo', g: 'Cairo', w: ':wght@400;700', css: 'Cairo,sans-serif', lang: 'ur', lh: 1.4 },
      { k: 'Tajawal', n: 'Tajawal', g: 'Tajawal', w: ':wght@400;700', css: 'Tajawal,sans-serif', lang: 'ur', lh: 1.4 }
    ];
    var fontLoaded = {}, fontPrev = {}, RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
    function fontDef(a) { var k = a.f || 'sans'; for (var i = 0; i < FONTS.length; i++) if (FONTS[i].k === k) return FONTS[i]; return FONTS[0]; }
    function gUrl(f, textOnly) {   // Google Fonts stylesheet; "text=" returns a tiny file with just the preview letters
      return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f.g).replace(/%20/g, '+') + (textOnly ? '' : f.w) + (textOnly ? '&text=' + encodeURIComponent('Aa اردو') : '') + '&display=swap';
    }
    function previewFont(f) {      // only for list previews, and never after the full font is in (a subset must not replace it)
      if (!f.g || fontLoaded[f.k] || fontPrev[f.k]) return; fontPrev[f.k] = 1;
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = gUrl(f, true); document.head.appendChild(l);
    }
    function useFont(f, done) {    // loads the whole font so every letter of the user's text is drawn with it
      if (!f.g || fontLoaded[f.k] === 2) { if (done) done(true); return; }
      if (fontLoaded[f.k] === 1) { if (done) setTimeout(function () { done(fontLoaded[f.k] === 2); }, 300); return; }
      fontLoaded[f.k] = 1;
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = gUrl(f, false);
      l.onerror = function () { fontLoaded[f.k] = 0; if (done) done(false); };
      l.onload = function () {
        var sample = f.lang === 'ur' ? 'اردو متن عید مبارک' : 'Aa Bb Cc 123';
        var jobs = [document.fonts.load('400 40px ' + f.css, sample), document.fonts.load('700 40px ' + f.css, sample)];
        Promise.all(jobs).then(function () { fontLoaded[f.k] = 2; if (done) done(true); }, function () { fontLoaded[f.k] = 2; if (done) done(true); });
      };
      document.head.appendChild(l);
    }
    function fontCss(a) { return (a.i ? 'italic ' : '') + (a.b ? '700 ' : '400 ') + Math.max(1, a.s) + 'px ' + fontDef(a).css; }
    function fontOf(a) { return fontCss(a); }
    var mctx = document.createElement('canvas').getContext('2d'), LS_OK = ('letterSpacing' in mctx);
    function lsPx(a) { return (a.ls || 0) * a.s; }
    function measureLine(ctx, a, str, rtl) {
      ctx.font = fontCss(a); try { ctx.direction = rtl ? 'rtl' : 'ltr'; } catch (e) { /* old browsers */ }
      var px = lsPx(a), w;
      if (LS_OK) { ctx.letterSpacing = px + 'px'; w = ctx.measureText(str).width; ctx.letterSpacing = '0px'; return Math.max(0, w - (str ? px : 0)); }
      w = ctx.measureText(str).width; if (px && !rtl) w += px * Math.max(0, str.length - 1); return Math.max(0, w);
    }
    function drawLine(ctx, a, str, x, y, rtl, stroke) {
      try { ctx.direction = rtl ? 'rtl' : 'ltr'; } catch (e) { /* old browsers */ }
      var px = lsPx(a);
      if (LS_OK) { ctx.letterSpacing = px + 'px'; if (stroke) ctx.strokeText(str, x, y); else ctx.fillText(str, x, y); ctx.letterSpacing = '0px'; return; }
      if (px && !rtl) { var cx = x; for (var i = 0; i < str.length; i++) { var ch = str.charAt(i); if (stroke) ctx.strokeText(ch, cx, y); else ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + px; } return; }
      if (stroke) ctx.strokeText(str, x, y); else ctx.fillText(str, x, y);
    }
    function txLayout(a) {
      var str = String(a.text == null ? '' : a.text), raw = str.length ? str : 'Type text';
      var lines = raw.split('\n').map(function (t) { var rtl = RTL_RE.test(t); return { t: t, rtl: rtl, w: measureLine(mctx, a, t, rtl) }; });
      var w = 0; lines.forEach(function (l) { w = Math.max(w, l.w); });
      var lh = (a.lh || fontDef(a).lh || 1.2) * a.s;
      return { lines: lines, w: w, h: lines.length * lh, lh: lh, empty: !str.length };
    }
    function textBox(a) {
      var L = txLayout(a), pad = a.bg ? a.s * 0.3 : 0;
      return { x: a.x, y: a.y, w: L.w + 2 * pad, h: L.h + 2 * pad, pad: pad, L: L };
    }
    function centerOf(a) { var b = textBox(a); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
    function recenter(a, c) { var b = textBox(a); a.x = c.x - b.w / 2; a.y = c.y - b.h / 2; }
    function lineLeft(a, b, ln) { var al = a.al || 'left'; return al === 'center' ? -ln.w / 2 : al === 'right' ? b.w / 2 - b.pad - ln.w : -b.w / 2 + b.pad; }
    function rrect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2); ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    }
    function drawText(ctx, a, ui) {
      var b = textBox(a), L = b.L;
      if (L.empty && !ui) return;
      ctx.save();
      ctx.globalAlpha *= clamp((a.op == null ? 100 : a.op) / 100, 0.05, 1);
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      if (a.rot) ctx.rotate(a.rot);
      if (a.skw) ctx.transform(1, 0, Math.tan(a.skw * Math.PI / 180), 1, 0, 0);
      if (a.bg && !L.empty) { ctx.fillStyle = hexA(a.bg, a.bga == null ? 0.6 : a.bga); rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, a.s * 0.22); ctx.fill(); }
      ctx.font = fontCss(a); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      var fill = a.c;
      if (a.g && a.g.length === 2) { var gr = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0); gr.addColorStop(0, a.g[0]); gr.addColorStop(1, a.g[1]); fill = gr; }
      if (L.empty) fill = 'rgba(255,255,255,.7)';
      var legacy = a.sh === undefined;
      L.lines.forEach(function (ln, i) {
        var y = -b.h / 2 + b.pad + (i + 0.5) * L.lh, x = lineLeft(a, b, ln);
        ctx.font = fontCss(a);
        if (a.sh && !L.empty) { ctx.shadowColor = hexA(a.shc || '#000000', 0.6); ctx.shadowBlur = a.s * (a.shb == null ? 0.08 : a.shb); ctx.shadowOffsetX = ctx.shadowOffsetY = a.s * 0.03; }
        else if (legacy) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = Math.max(1, a.s * 0.08); }
        if (a.sk > 0 && !L.empty) {
          ctx.lineWidth = a.sk * a.s; ctx.strokeStyle = a.skc || '#000000'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
          drawLine(ctx, a, ln.t, x, y, ln.rtl, true);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        }
        ctx.fillStyle = fill; drawLine(ctx, a, ln.t, x, y, ln.rtl, false);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        if (a.u && !L.empty) { ctx.fillStyle = typeof fill === 'string' ? fill : a.g[0]; ctx.fillRect(x, y + a.s * 0.42, ln.w, Math.max(1, a.s * 0.065)); }
      });
      ctx.restore();
    }
    function hitTextBox(a, p, m) {
      var b = textBox(a), dx = p.x - (b.x + b.w / 2), dy = p.y - (b.y + b.h / 2), th = a.rot || 0, c = Math.cos(th), sn = Math.sin(th);
      var lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
      return Math.abs(lx) <= b.w / 2 + m && Math.abs(ly) <= b.h / 2 + m;
    }
    function txPts(a) {
      var b = textBox(a), pad = 8 / CK, hw = b.w / 2 + pad, hh = b.h / 2 + pad, cx = b.x + b.w / 2, cy = b.y + b.h / 2, th = a.rot || 0, c = Math.cos(th), sn = Math.sin(th);
      function r(lx, ly) { return { x: cx + lx * c - ly * sn, y: cy + lx * sn + ly * c }; }
      var Wb = S.base.width, Hb = S.base.height, mg = 18 / CK;
      function cl(q) { return { x: clamp(q.x, mg, Wb - mg), y: clamp(q.y, mg, Hb - mg) }; }
      return { x: cl(r(-hw, -hh)), e: cl(r(hw, -hh)), r: cl(r(hw, hh)), l: cl(r(-hw, hh)), c: { x: cx, y: cy }, hw: hw, hh: hh };
    }
    function txHandle(a, p) {
      var pts = txPts(a), R = 28 / CK, best = null, bd = 1e9;
      ['x', 'e', 'r'].forEach(function (k) { var d = Math.hypot(p.x - pts[k].x, p.y - pts[k].y); if (d < R && d < bd) { bd = d; best = k; } });
      return best;
    }
    function drawHandle(ctx, cx, cy, r, type) {
      ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#10b981'; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#10b981'; ctx.fillStyle = '#10b981'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.2; var d = r * 0.42;
      if (type === 'x') { ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); ctx.stroke(); }
      else if (type === 'e') { ctx.beginPath(); ctx.moveTo(cx - d, cy + d); ctx.lineTo(cx - d * 0.2, cy + d * 0.9); ctx.lineTo(cx + d, cy - d * 0.3); ctx.lineTo(cx + d * 0.3, cy - d); ctx.lineTo(cx - d * 0.9, cy + d * 0.2); ctx.closePath(); ctx.stroke(); }
      else { var q = r * 0.5; ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy + d); ctx.lineTo(cx + d, cy + d - q); ctx.moveTo(cx + d, cy + d); ctx.lineTo(cx + d - q, cy + d); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx - d, cy - d + q); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx - d + q, cy - d); ctx.stroke(); }
      ctx.restore();
    }
    function caretOf(a) {
      var ta = $('ieTxIn'); if (!ta) return null;
      var str = String(a.text || ''), idx = clamp(ta.selectionEnd == null ? str.length : ta.selectionEnd, 0, str.length), before = str.slice(0, idx);
      var li = before.split('\n').length - 1, L = txLayout(a), ln = L.lines[li]; if (!ln || L.empty && false) return null;
      var col = before.length - (before.lastIndexOf('\n') + 1), pw = measureLine(mctx, a, ln.t.slice(0, col), ln.rtl);
      return { li: li, ln: ln, w: pw };
    }
    function drawTextFrame(ctx, a) {
      var b = textBox(a), pts = txPts(a), pad = 8 / CK;
      ctx.save(); ctx.translate(pts.c.x, pts.c.y); ctx.rotate(a.rot || 0);
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5 / CK; if (a.lock) ctx.setLineDash([6 / CK, 5 / CK]);
      ctx.strokeRect(-pts.hw, -pts.hh, 2 * pts.hw, 2 * pts.hh); ctx.setLineDash([]);
      if (txEditing && caretOn && !a.lock) {
        var cr = caretOf(a);
        if (cr) {
          var left = lineLeft(a, b, cr.ln), x = cr.ln.rtl ? left + cr.ln.w - cr.w : left + cr.w, y = -b.h / 2 + b.pad + (cr.li + 0.5) * b.L.lh;
          ctx.fillStyle = '#10b981'; ctx.fillRect(x - 1.2 / CK, y - b.L.lh * 0.42, 2.4 / CK, b.L.lh * 0.84);
        }
      }
      ctx.restore();
      var hr = 15 / CK; drawHandle(ctx, pts.x.x, pts.x.y, hr, 'x'); drawHandle(ctx, pts.e.x, pts.e.y, hr, 'e'); drawHandle(ctx, pts.r.x, pts.r.y, hr, 'r');
      if (a.lock) { ctx.save(); ctx.font = (18 / CK) + 'px sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText('🔒', pts.l.x, pts.l.y); ctx.restore(); }
    }

    function drawAnnots(ctx, list, ui) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      list.forEach(function (a, i) {
        drawOne(ctx, a, ui);
        if (ui && i === S.sel) outline(ctx, a);
      });
      ctx.restore();
    }
    function drawOne(ctx, a, ui) {
      if (a.t === 'text') {
        drawText(ctx, a, ui);
      } else if (a.t === 'draw') {
        if (a.points && a.points.length) { ctx.strokeStyle = a.c; ctx.lineWidth = a.lw; ctx.beginPath(); ctx.moveTo(a.points[0].x, a.points[0].y); for (var pi = 1; pi < a.points.length; pi++) ctx.lineTo(a.points[pi].x, a.points[pi].y); ctx.stroke(); }
      } else if (a.t === 'img') {
        var im = IMGS[a.id];
        if (im) { ctx.save(); ctx.globalAlpha = clamp((a.o == null ? 100 : a.o) / 100, 0.05, 1); ctx.drawImage(im, a.x, a.y, a.w, a.h); ctx.restore(); }
      } else if (a.t === 'rect') {
        if (a.fill) { ctx.fillStyle = hexA(a.c, 0.28); ctx.fillRect(a.x, a.y, a.w, a.h); }
        ctx.strokeStyle = a.c; ctx.lineWidth = a.lw; ctx.strokeRect(a.x, a.y, a.w, a.h);
      } else if (a.t === 'circle') {
        ctx.beginPath(); ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.max(1, Math.abs(a.w / 2)), Math.max(1, Math.abs(a.h / 2)), 0, 0, Math.PI * 2);
        if (a.fill) { ctx.fillStyle = hexA(a.c, 0.28); ctx.fill(); }
        ctx.strokeStyle = a.c; ctx.lineWidth = a.lw; ctx.stroke();
      } else if (a.t === 'arrow') {
        var dx = a.x2 - a.x1, dy = a.y2 - a.y1, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
        var head = Math.min(len * 0.6, Math.max(14, a.lw * 4)), bx = a.x2 - Math.cos(ang) * head * 0.8, by = a.y2 - Math.sin(ang) * head * 0.8;
        ctx.strokeStyle = a.c; ctx.fillStyle = a.c; ctx.lineWidth = a.lw;
        ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(bx, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x2, a.y2);
        ctx.lineTo(a.x2 - head * Math.cos(ang - 0.45), a.y2 - head * Math.sin(ang - 0.45));
        ctx.lineTo(a.x2 - head * Math.cos(ang + 0.45), a.y2 - head * Math.sin(ang + 0.45));
        ctx.closePath(); ctx.fill();
      }
    }
    function hexA(hex, al) {
      var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
      return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + al + ')' : hex;
    }
    function bbox(a) {
      if (a.t === 'text') return textBox(a);
      if (a.t === 'draw' && a.points && a.points.length) { var xs = a.points.map(function(p){return p.x;}), ys = a.points.map(function(p){return p.y;}); var minx=Math.min.apply(null,xs), maxx=Math.max.apply(null,xs), miny=Math.min.apply(null,ys), maxy=Math.max.apply(null,ys); return {x:minx,y:miny,w:maxx-minx,h:maxy-miny}; }
      if (a.t === 'arrow') return { x: Math.min(a.x1, a.x2), y: Math.min(a.y1, a.y2), w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1) };
      return { x: Math.min(a.x, a.x + a.w), y: Math.min(a.y, a.y + a.h), w: Math.abs(a.w), h: Math.abs(a.h) };
    }
    function outline(ctx, a) {
      if (a.t === 'text' && S.tool === 'text') { drawTextFrame(ctx, a); return; }
      var b = bbox(a), pad = 6 / K;
      ctx.save(); ctx.setLineDash([8 / K, 6 / K]); ctx.lineWidth = 2 / K; ctx.strokeStyle = '#1d7be0';
      ctx.strokeRect(b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad); ctx.restore();
    }

    function drawWm(ctx, w, h) {
      var m = S.wm;
      if (!m.on) return;
      var isImg = m.type === 'logo';
      if (isImg ? !m.img : !m.text) return;
      var px = w * m.size / 100, tw, th;
      ctx.save();
      ctx.globalAlpha = clamp(m.opacity / 100, 0.05, 1);
      if (isImg) { tw = px; th = px * m.img.naturalHeight / m.img.naturalWidth; }
      else { ctx.font = 'bold ' + px + 'px sans-serif'; ctx.textBaseline = 'top'; ctx.fillStyle = m.color; tw = ctx.measureText(m.text).width; th = px * 1.15; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = px * 0.1; }
      function put(x, y) { if (isImg) ctx.drawImage(m.img, x, y, tw, th); else ctx.fillText(m.text, x, y); }
      if (m.pos === 'tile') {
        var diag = Math.hypot(w, h), stepX = tw * 1.7 + px, stepY = th * 3.2;
        ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 6);
        for (var y = -diag; y < diag; y += stepY) for (var x = -diag; x < diag; x += stepX) put(x, y);
      } else {
        var mg = w * 0.03, x0 = m.pos.indexOf('l') >= 0 ? mg : m.pos.indexOf('r') >= 0 ? w - tw - mg : (w - tw) / 2,
            y0 = m.pos.indexOf('t') >= 0 ? mg : m.pos.indexOf('b') >= 0 ? h - th - mg : (h - th) / 2;
        put(x0, y0);
      }
      ctx.restore();
    }

    function render() {
      if (!S.base) return;
      ensureView();
      var ctx = cv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(view, 0, 0);
      ctx.save(); ctx.scale(K, K);
      drawAnnots(ctx, S.annots, true);
      if (tmp) drawAnnots(ctx, [tmp], false);
      drawWm(ctx, S.base.width, S.base.height);
      ctx.restore();
      if (S.tool === 'crop' && crop) drawCropUI(ctx);
      if (blurRect) drawBlurSel(ctx);
      if (autoDirty && !drag) scheduleSave();
    }

    function drawCropUI(ctx) {
      var x = crop.x * K, y = crop.y * K, w = crop.w * K, h = crop.h * K;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, 0, cv.width, y); ctx.fillRect(0, y + h, cv.width, cv.height - y - h);
      ctx.fillRect(0, y, x, h); ctx.fillRect(x + w, y, cv.width - x - w, h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.moveTo(x + w / 3, y); ctx.lineTo(x + w / 3, y + h); ctx.moveTo(x + 2 * w / 3, y); ctx.lineTo(x + 2 * w / 3, y + h);
      ctx.moveTo(x, y + h / 3); ctx.lineTo(x + w, y + h / 3); ctx.moveTo(x, y + 2 * h / 3); ctx.lineTo(x + w, y + 2 * h / 3); ctx.stroke();
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 10 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#1d7be0'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * dpr; ctx.stroke();
      });
      var label = Math.round(crop.w) + ' × ' + Math.round(crop.h) + ' px';
      ctx.font = 'bold ' + 12 * dpr + 'px sans-serif'; ctx.textBaseline = 'top';
      var tw = ctx.measureText(label).width + 12 * dpr, ly = Math.max(2 * dpr, y - 22 * dpr);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, ly, tw, 20 * dpr);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 6 * dpr, ly + 4 * dpr);
      ctx.restore();
    }
    function drawBlurSel(ctx) {
      var r = blurRect;
      ctx.save(); ctx.setLineDash([8 * dpr, 6 * dpr]); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#fff';
      ctx.fillStyle = 'rgba(29,123,224,.25)';
      ctx.fillRect(r.x * K, r.y * K, r.w * K, r.h * K); ctx.strokeRect(r.x * K, r.y * K, r.w * K, r.h * K); ctx.restore();
    }

    // ---------------------------------------------------------------- tools
    function setTool(t) {
      blurTx();
      S.tool = t; S.sel = -1; tmp = null; blurRect = null; crop = null;
      Array.prototype.forEach.call($('ieTools').children, function (b) { b.setAttribute('aria-pressed', b.dataset.t === t ? 'true' : 'false'); });
      cv.style.touchAction = (imm || t === 'crop' || t === 'text' || t === 'arrow' || t === 'rect' || t === 'circle' || t === 'blur' || t === 'image') ? 'none' : 'pan-y';
      var tt = $('ieTitle'); if (tt) { var tl = TOOLS.filter(function (x) { return x[0] === t; })[0]; tt.textContent = tl ? String(tl[1]).replace(/^\S+\s+/, '') : ''; }
      cv.style.cursor = t === 'crop' || t === 'blur' || t === 'arrow' || t === 'rect' || t === 'circle' ? 'crosshair' : t === 'text' ? 'text' : t === 'image' ? 'move' : 'default';
      // Crop starts with no overlay; the user chooses a preset to place one.
      if (t !== 'crop') crop = null;
      layout(); render(); renderOpts();
      if (imm) window.requestAnimationFrame(function () { if (imm && S.base) { layout(); render(); } });   // the options panel height changed with the tool
    }

    function initCrop() {
      var w = S.base.width, h = S.base.height, cw = w * 0.9, ch = h * 0.9;
      if (P.aspect) { if (cw / ch > P.aspect) cw = ch * P.aspect; else ch = cw / P.aspect; }
      crop = { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
    }
    function refitCrop() {
      if (!crop) return initCrop();
      var cx = crop.x + crop.w / 2, cy = crop.y + crop.h / 2, W = S.base.width, H = S.base.height;
      var w = crop.w, h = crop.h;
      if (P.aspect) { if (w / h > P.aspect) w = h * P.aspect; else h = w / P.aspect; }
      w = Math.min(w, W); h = Math.min(h, H);
      if (P.aspect) { if (w / h > P.aspect) w = h * P.aspect; else h = w / P.aspect; }
      crop = { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w: w, h: h };
    }
    function setCropFromAnchor(ax, ay, px, py) {
      var ar = P.aspect, W = S.base.width, H = S.base.height;
      var dx = px - ax, dy = py - ay, sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1, w = Math.abs(dx), h = Math.abs(dy);
      if (ar) { if (w / Math.max(h, 1e-6) > ar) w = h * ar; else h = w / ar; }
      var maxW = sx > 0 ? W - ax : ax, maxH = sy > 0 ? H - ay : ay;
      if (w > maxW) { w = maxW; if (ar) h = w / ar; }
      if (h > maxH) { h = maxH; if (ar) w = h * ar; }
      w = Math.max(w, 20); h = Math.max(h, ar ? 20 / ar : 20);
      crop = { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w: w, h: h };
    }
    function applyCrop() {
      if (!crop || crop.w < 2 || crop.h < 2) return;
      pushHist(); bake();
      var c = newCanvas(crop.w, crop.h);
      c.getContext('2d').drawImage(S.base, Math.round(crop.x), Math.round(crop.y), c.width, c.height, 0, 0, c.width, c.height);
      S.base = c; crop = null; P.aspect = null; layout(); render(); renderOpts();
    }

    // Shapes and text are merged into the photo before a geometry change (crop / rotate / flip)
    function bake() {
      if (!S.annots.length) return;
      var c = newCanvas(S.base.width, S.base.height), x = c.getContext('2d');
      x.drawImage(S.base, 0, 0); drawAnnots(x, S.annots, false);
      S.base = c; S.annots = []; S.sel = -1;
    }
    function rotate(q) {
      pushHist(); bake();
      var w = S.base.width, h = S.base.height, sw = q === 2 ? w : h, sh = q === 2 ? h : w;
      var c = newCanvas(sw, sh), x = c.getContext('2d');
      x.translate(sw / 2, sh / 2); x.rotate(q * Math.PI / 2); x.drawImage(S.base, -w / 2, -h / 2);
      S.base = c; layout(); render();
    }
    function flip(dir) {
      pushHist(); bake();
      var w = S.base.width, h = S.base.height, c = newCanvas(w, h), x = c.getContext('2d');
      if (dir === 'h') { x.translate(w, 0); x.scale(-1, 1); } else { x.translate(0, h); x.scale(1, -1); }
      x.drawImage(S.base, 0, 0); S.base = c; layout(); render();
    }

    var FILTER_OK = (function () { try { var x = document.createElement('canvas').getContext('2d'); x.filter = 'blur(2px)'; return x.filter === 'blur(2px)'; } catch (e) { return false; } })();
    function boxBlur(d, w, h, r) {
      var a = d.data, t = new Uint8ClampedArray(a.length), pass, i, x, y, ch, sum, n;
      for (pass = 0; pass < 3; pass++) {
        for (y = 0; y < h; y++) for (ch = 0; ch < 4; ch++) {
          sum = 0; n = 0;
          for (x = -r; x <= r; x++) { if (x >= 0 && x < w) { sum += a[(y * w + x) * 4 + ch]; n++; } }
          for (x = 0; x < w; x++) {
            t[(y * w + x) * 4 + ch] = sum / n;
            var add = x + r + 1, rem = x - r;
            if (add < w) { sum += a[(y * w + add) * 4 + ch]; n++; }
            if (rem >= 0) { sum -= a[(y * w + rem) * 4 + ch]; n--; }
          }
        }
        for (x = 0; x < w; x++) for (ch = 0; ch < 4; ch++) {
          sum = 0; n = 0;
          for (y = -r; y <= r; y++) { if (y >= 0 && y < h) { sum += t[(y * w + x) * 4 + ch]; n++; } }
          for (y = 0; y < h; y++) {
            a[(y * w + x) * 4 + ch] = sum / n;
            var add2 = y + r + 1, rem2 = y - r;
            if (add2 < h) { sum += t[(add2 * w + x) * 4 + ch]; n++; }
            if (rem2 >= 0) { sum -= t[(rem2 * w + x) * 4 + ch]; n--; }
          }
        }
      }
    }
    function applyBlur(r) {
      var W = S.base.width, H = S.base.height;
      var x0 = Math.round(clamp(r.x, 0, W)), y0 = Math.round(clamp(r.y, 0, H));
      var x1 = Math.round(clamp(r.x + r.w, 0, W)), y1 = Math.round(clamp(r.y + r.h, 0, H));
      var w = x1 - x0, h = y1 - y0;
      if (w < 4 || h < 4) return;
      pushHist();
      var scale = Math.max(1, W / 1000), c = newCanvas(W, H), x = c.getContext('2d');
      x.drawImage(S.base, 0, 0);
      if (P.blurStyle === 'pixel') {
        var blk = Math.max(3, Math.round(P.blurStrength * scale * 0.8));
        var sw = Math.max(1, Math.round(w / blk)), sh = Math.max(1, Math.round(h / blk));
        var t = newCanvas(sw, sh), tx = t.getContext('2d');
        tx.imageSmoothingEnabled = true; tx.drawImage(S.base, x0, y0, w, h, 0, 0, sw, sh);
        x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, sw, sh, x0, y0, w, h); x.imageSmoothingEnabled = true;
      } else {
        var rad = Math.max(2, Math.round(P.blurStrength * scale)), pad = rad * 3;
        var bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad), bw = Math.min(W, x1 + pad) - bx, bh = Math.min(H, y1 + pad) - by;
        var tc = newCanvas(bw, bh), tcx = tc.getContext('2d');
        if (FILTER_OK) { tcx.filter = 'blur(' + rad + 'px)'; tcx.drawImage(S.base, bx, by, bw, bh, 0, 0, bw, bh); tcx.filter = 'none'; }
        else { tcx.drawImage(S.base, bx, by, bw, bh, 0, 0, bw, bh); var d = tcx.getImageData(0, 0, bw, bh); boxBlur(d, bw, bh, Math.max(1, Math.round(rad / 2))); tcx.putImageData(d, 0, 0); }
        x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip(); x.drawImage(tc, bx, by); x.restore();
      }
      S.base = c; layout(); render();
    }

    // ---------------------------------------------------------------- pointer handling
    function pt(e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * S.base.width, y: (e.clientY - r.top) / r.height * S.base.height };
    }
    function segDist(p, a) {
      var vx = a.x2 - a.x1, vy = a.y2 - a.y1, l2 = vx * vx + vy * vy || 1;
      var t = clamp(((p.x - a.x1) * vx + (p.y - a.y1) * vy) / l2, 0, 1);
      return Math.hypot(p.x - (a.x1 + t * vx), p.y - (a.y1 + t * vy));
    }
    function hit(p) {
      var tol = 14 / CK;
      for (var i = S.annots.length - 1; i >= 0; i--) {
        var a = S.annots[i], b = bbox(a);
        if (a.t === 'arrow') { if (segDist(p, a) <= tol + a.lw / 2) return i; }
        else if (a.t === 'img') { if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return i; }
        else if (a.t === 'text') { if (hitTextBox(a, p, tol / 2)) return i; }
        else if (a.t === 'rect') {
          var inOuter = p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
          var inInner = p.x > b.x + tol && p.x < b.x + b.w - tol && p.y > b.y + tol && p.y < b.y + b.h - tol;
          if (inOuter && (a.fill || !inInner)) return i;
        } else if (a.t === 'circle') {
          var rx = Math.max(b.w / 2, 1), ry = Math.max(b.h / 2, 1), dx = (p.x - (b.x + rx)) / rx, dy = (p.y - (b.y + ry)) / ry, d = Math.hypot(dx, dy);
          if (a.fill ? d <= 1 + tol / Math.min(rx, ry) : Math.abs(d - 1) <= tol / Math.min(rx, ry)) return i;
        }
      }
      return -1;
    }
    function lwPx() { return Math.max(1, P.lw * Math.max(1, S.base.width / 800)); }

    cv.addEventListener('pointerdown', function (e) {
      if (!S.base) return;
      var p = pt(e), t = S.tool;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; pendingFocus = false;
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      if (t === 'crop') {
        var cx = [[crop.x, crop.y], [crop.x + crop.w, crop.y], [crop.x, crop.y + crop.h], [crop.x + crop.w, crop.y + crop.h]], best = -1, bd = 28 / CK;
        cx.forEach(function (c, i) { var d = Math.hypot(p.x - c[0], p.y - c[1]); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { var opp = cx[3 - best]; drag = { mode: 'corner', ax: opp[0], ay: opp[1] }; }
        else if (p.x >= crop.x && p.x <= crop.x + crop.w && p.y >= crop.y && p.y <= crop.y + crop.h) drag = { mode: 'move', ox: p.x - crop.x, oy: p.y - crop.y };
        else drag = { mode: 'corner', ax: p.x, ay: p.y };
      } else if (t === 'blur') {
        drag = { mode: 'blur', x0: p.x, y0: p.y }; blurRect = { x: p.x, y: p.y, w: 0, h: 0 };
      } else if (t === 'draw') {
        tmp = { t: 'draw', points: [{x:p.x,y:p.y}], c: P.color, lw: lwPx() };
        drag = { mode: 'draw', x0: p.x, y0: p.y };
      } else if (t === 'text') {
        textDown(p);
      } else if (t === 'arrow' || t === 'rect' || t === 'circle' || t === 'image') {
        var h = hit(p);
        if (h >= 0) {
          S.sel = h; var a = S.annots[h];
          drag = { mode: 'move', ox: p.x, oy: p.y, start: JSON.parse(JSON.stringify(a)), moved: false };
          if (a.t === 'text') { P.text = a.text; P.textColor = a.c; P.bold = !!a.b; P.textSize = a.s / S.base.width * 100; }
          else if (a.t === 'img') { P.imgOpacity = a.o == null ? 100 : a.o; P.imgSize = a.w / S.base.width * 100; }
          else { P.color = a.c; P.lw = a.lw / Math.max(1, S.base.width / 800); if (a.t !== 'arrow') P.fill = !!a.fill; }
          renderOpts();
        } else if (t === 'image') {
          S.sel = -1; drag = null; renderOpts();
        } else {
          S.sel = -1; drag = { mode: 'draw', x0: p.x, y0: p.y };
          tmp = t === 'arrow' ? { t: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, c: P.color, lw: lwPx() }
            : { t: t, x: p.x, y: p.y, w: 0, h: 0, c: P.color, lw: lwPx(), fill: P.fill };
        }
      }
      render(); e.preventDefault();
    });

    cv.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (!drag || !S.base) return;
      var p = pt(e), W = S.base.width, H = S.base.height;
      if (drag.mode === 'tscale') {      // one arrow: distance from the centre = size, angle = rotation (any angle)
        var tdx = p.x - drag.c.x, tdy = p.y - drag.c.y, tdist = Math.max(1, Math.hypot(tdx, tdy));
        drag.a.s = clamp(drag.s0 * tdist / drag.d0, W * 0.015, W * 0.7); drag.a.rot = drag.r0 + (Math.atan2(tdy, tdx) - drag.a0); recenter(drag.a, drag.c); render(); return;
      }
      if (drag.mode === 'pinch') {       // two fingers: size and rotation
        var ks = Object.keys(ptrs); if (ks.length < 2) return;
        var q1 = ptrs[ks[0]], q2 = ptrs[ks[1]], dd = Math.max(10, Math.hypot(q2.x - q1.x, q2.y - q1.y)), an = Math.atan2(q2.y - q1.y, q2.x - q1.x);
        drag.a.s = clamp(drag.s0 * dd / drag.d0, W * 0.015, W * 0.7); drag.a.rot = drag.r0 + (an - drag.a0); recenter(drag.a, drag.c); render(); return;
      }
      if (S.tool === 'crop') drag.changed = true;
      if (drag.mode === 'corner') setCropFromAnchor(drag.ax, drag.ay, clamp(p.x, 0, W), clamp(p.y, 0, H));
      else if (drag.mode === 'move' && S.tool === 'crop') { crop.x = clamp(p.x - drag.ox, 0, W - crop.w); crop.y = clamp(p.y - drag.oy, 0, H - crop.h); }
      else if (drag.mode === 'blur') { blurRect = { x: Math.min(drag.x0, p.x), y: Math.min(drag.y0, p.y), w: Math.abs(p.x - drag.x0), h: Math.abs(p.y - drag.y0) }; }
      else if (drag.mode === 'draw') {
        if (tmp.t === 'arrow') { tmp.x2 = p.x; tmp.y2 = p.y; } else if (tmp.t === 'draw') { tmp.points.push({x:p.x,y:p.y}); } else { tmp.w = p.x - drag.x0; tmp.h = p.y - drag.y0; }
      } else if (drag.mode === 'move') {
        var a = S.annots[S.sel], dx = p.x - drag.ox, dy = p.y - drag.oy, s0 = drag.start;
        if (a && a.lock) return;
        if (!drag.moved && Math.hypot(dx, dy) * CK < 3) return;
        if (!drag.moved) { drag.moved = true; var keep = S.annots[S.sel]; S.annots[S.sel] = s0; pushHist(); S.annots[S.sel] = keep; }
        if (a.t === 'arrow') { a.x1 = s0.x1 + dx; a.y1 = s0.y1 + dy; a.x2 = s0.x2 + dx; a.y2 = s0.y2 + dy; }
        else {
          a.x = s0.x + dx; a.y = s0.y + dy;
          if (a.t === 'text') { var tb = textBox(a); a.x = clamp(a.x, -tb.w * 0.5, S.base.width - tb.w * 0.5); a.y = clamp(a.y, -tb.h * 0.5, S.base.height - tb.h * 0.5); }
        }
      }
      render();
    });

    function endDrag(e) {
      delete ptrs[e.pointerId];
      if (!drag) return;
      var d = drag; drag = null;
      if (d.mode === 'move' && d.text && !d.moved && S.tool === 'text') { var tt = selText(); if (tt && !tt.lock && !txEditing) pendingFocus = true; }
      try { cv.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      // Moving/resizing the crop frame only adjusts it; Save Crop applies it explicitly.
      if (d.mode === 'blur') { var r = blurRect; blurRect = null; if (r && r.w * CK > 6 && r.h * CK > 6) applyBlur(r); }
      else if (d.mode === 'draw' && tmp) {
        var big = tmp.t === 'draw' ? tmp.points.length > 1 : (tmp.t === 'arrow' ? Math.hypot(tmp.x2 - tmp.x1, tmp.y2 - tmp.y1) * CK > 8 : Math.abs(tmp.w) * CK > 6 && Math.abs(tmp.h) * CK > 6);
        if (big) { pushHist(); S.annots.push(tmp); S.sel = S.annots.length - 1; }
        tmp = null; renderOpts();
      }
      render();
    }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('click', function () { if (pendingFocus) { pendingFocus = false; focusTx(); } });   // the keyboard must open from a real tap
    function keepTyping(e) {           // a tap on the text being edited must not close the keyboard
      if (!txEditing) return; var a = selText(); if (!a) return; var tp = e.touches ? e.touches[0] : e; if (!tp) return; var q = pt(tp);
      if ((hitTextBox(a, q, 12 / CK) || txHandle(a, q)) && e.cancelable) e.preventDefault();
    }
    cv.addEventListener('touchstart', keepTyping, { passive: false }); cv.addEventListener('mousedown', keepTyping);
    cv.addEventListener('pointercancel', endDrag);

    // ---------------------------------------------------------------- option panels
    function slider(id, label, min, max, val, suffix) {
      return '<label>' + label + ' <input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '"> <span class="ie-val" id="' + id + 'V">' + val + (suffix || '') + '</span></label>';
    }
    function chips(attr, list, cur) {
      return list.map(function (x) { return '<button type="button" class="chip" ' + attr + '="' + x[0] + '" aria-pressed="' + (String(cur) === String(x[0])) + '">' + x[1] + '</button>'; }).join('');
    }
    function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); }
    function selObj() { return S.sel >= 0 ? S.annots[S.sel] : null; }
    // A change made with a control on the selected shape/text is one undo step
    function edit(fn) { if (!optEditing) { pushHist(); optEditing = true; } fn(); render(); }
    function endEdit() { optEditing = false; }

    function renderOpts() {
      var t = S.tool, h = '', wm = S.wm;
      if (!t) {
        h = '<p class="ie-hint">Choose a tool above to start editing. Every change applies instantly.</p>';
      } else if (t === 'crop') {
        h = '<div class="ie-row" id="ieAsp">' + chips('data-ar', [['', 'Free crop'], ['0.6666667', 'Passport'], ['1.5', 'Landscape'], ['1', '1:1'], ['1.3333333', '4:3'], ['0.75', '3:4'], ['1.7777778', '16:9'], ['0.5625', '9:16']], P.aspect ? P.aspect : '') + '</div>' +
          '<div class="ie-row"><button type="button" class="btn dl" id="ieCropOk"' + (!crop ? ' disabled' : '') + '>✓ Save Crop</button><button type="button" class="btn red" id="ieCropReset"' + (!crop ? ' disabled' : '') + '>Reset box</button></div>' +
          '<p class="ie-hint">Choose a crop size to show the frame. Drag the frame or its corner handles to position and size it, then tap Save Crop. The main gallery image will not keep the crop frame.</p>';
      } else if (t === 'rotate') {
        h = '<div class="ie-row"><button type="button" class="btn" data-rot="1">↻ Rotate image 90°</button></div><p class="ie-hint">Tap repeatedly to rotate the photo clockwise in 90° steps. The gallery preview updates each time.</p>';
      } else if (t === 'flip') {
        h = '<div class="ie-row"><button type="button" class="chip" data-flip="h">⇋ Flip horizontal</button><button type="button" class="chip" data-flip="v">⇅ Flip vertical</button></div>';
      } else if (t === 'text') {
        h = txOptsHtml();
      } else if (t === 'draw') {
        h = '<label>Colour <input type="color" id="ieSc" value="' + P.color + '"></label>' + slider('ieLw', 'Thickness', 1, 30, Math.round(P.lw), '') + '<div class="ie-row"><button type="button" class="chip" id="ieDelAll">Delete all drawings</button></div><p class="ie-hint">Draw freehand directly on the photo. Choose any colour and line thickness.</p>';
      } else if (t === 'arrow' || t === 'rect' || t === 'circle') {
        h = '<label>Colour <input type="color" id="ieSc" value="' + P.color + '"></label>' + slider('ieLw', 'Thickness', 1, 20, Math.round(P.lw), '') +
          (t === 'arrow' ? '' : '<label><input type="checkbox" id="ieFill"' + (P.fill ? ' checked' : '') + '> Fill</label>') +
          '<div class="ie-row"><button type="button" class="chip" id="ieDelSel">🗑 Delete selected</button><button type="button" class="chip" id="ieDelAll">Delete all shapes</button></div>' +
          '<p class="ie-hint">' + (t === 'arrow' ? 'Drag on the photo to draw an arrow.' : 'Drag on the photo to draw.') + ' Tap a shape to select and move it.</p>';
      } else if (t === 'blur') {
        h = '<div class="ie-row" id="ieBs">' + chips('data-bs', [['blur', 'Blur'], ['pixel', 'Pixelate']], P.blurStyle) + '</div>' +
          slider('ieBr', 'Strength', 2, 40, Math.round(P.blurStrength), '') +
          '<p class="ie-hint">Drag over faces, numbers or any private detail to hide it. You can undo.</p>';
      } else if (t === 'brightness') {
        h = slider('ieBri', 'Brightness', -100, 100, S.adj.b, '') + '<button type="button" class="chip" id="ieAdjReset">Reset</button>';
      } else if (t === 'contrast') {
        h = slider('ieCon', 'Contrast', -100, 100, S.adj.c, '') + '<button type="button" class="chip" id="ieAdjReset">Reset</button>';
      } else if (t === 'image') {
        h = '<div class="ie-row"><button type="button" class="chip" id="ieImgPick">⬆ Choose image to add</button><input type="file" id="ieImgFile" accept="image/*" hidden></div>' +
          slider('ieImgS', 'Size', 5, 100, Math.round(P.imgSize), '%') + slider('ieImgO', 'Opacity', 5, 100, Math.round(P.imgOpacity), '%') +
          '<div class="ie-row"><button type="button" class="chip" id="ieDelSel">🗑 Delete selected</button></div>' +
          '<p class="ie-hint">Pick a picture to place on top of your photo. Drag it to move; tap it to select, then change size or opacity.</p>';
      } else if (t === 'sticker') {
        var stickerSets = {
          smileys: ['😀','😍','😂','🥹','😎','😘','🥳','😢','😡','🤔','🤗','😴'],
          hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖','💘','💝'],
          nature: ['🌸','🌹','🌻','🌈','☀️','⭐','🌙','🔥','🍀','🌼','🌷','🦋'],
          symbols: ['👍','👏','🙏','💯','🎉','🎂','🏆','✔️','❌','⚡','💡','📌'],
          animals: ['🐱','🐶','🐼','🦁','🐸','🐰','🦄','🐻','🐵','🐥','🦊','🐢']
        };
        h = '<div class="ie-row" id="ieStickerCats">' + chips('data-sc', [['smileys','😀 Smileys'],['hearts','❤️ Hearts'],['nature','🌿 Nature'],['symbols','✨ Symbols'],['animals','🐾 Animals']], stickerCategory) + '</div>' +
          '<div class="ie-row ie-sticker-grid" id="ieStickerChoices">' + stickerSets[stickerCategory].map(function (v) { return '<button type="button" class="chip ie-sticker" data-sticker="' + v + '" aria-label="Add sticker ' + v + '">' + v + '</button>'; }).join('') + '</div>' +
          '<label>Sticker size ' + slider('ieStickerSize', '', 4, 30, 12, '%').replace('<label>', '').replace('</label>', '') + '</label>' +
          '<p class="ie-hint">Choose a category, then tap a sticker to add it to the centre of your photo. Drag it to reposition.</p>';
      } else if (t === 'watermark') {
        h = '<div class="ie-row" id="ieWt">' + chips('data-wt', [['text', 'Text'], ['logo', 'Logo image']], wm.type) + '</div>' +
          (wm.type === 'text'
            ? '<input type="text" id="ieWmT" maxlength="60" placeholder="Watermark text, e.g. © Your Name" value="' + escapeAttr(wm.text) + '">' + '<label>Colour <input type="color" id="ieWmC" value="' + wm.color + '"></label>'
            : '<button type="button" class="chip" id="ieWmPick">⬆ Choose logo image</button><input type="file" id="ieWmFile" accept="image/*" hidden>') +
          slider('ieWmS', 'Size', 3, 60, wm.size, '%') + slider('ieWmO', 'Opacity', 5, 100, wm.opacity, '%') +
          '<div class="ie-row" id="ieWp">' + chips('data-wp', [['tl', 'Top left'], ['tr', 'Top right'], ['c', 'Centre'], ['bl', 'Bottom left'], ['br', 'Bottom right'], ['tile', 'Repeat']], wm.pos) + '</div>' +
          '<div class="ie-row"><label><input type="checkbox" id="ieWmOn"' + (wm.on ? ' checked' : '') + '> Show watermark</label></div>';
      }
      optsEl.innerHTML = h;
      wireOpts();
    }
    function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
    function setVal(id, text) { var el = $(id); if (el) el.textContent = text; }

    function wireOpts() {
      var t = S.tool;
      if (t === 'crop') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-ar]'), function (b) {
          b.addEventListener('click', function () {
            P.aspect = b.dataset.ar ? parseFloat(b.dataset.ar) : null;
            Array.prototype.forEach.call(optsEl.querySelectorAll('[data-ar]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            initCrop(); render(); renderOpts();
          });
        });
        on('ieCropOk', 'click', applyCrop);
        on('ieCropReset', 'click', function () { crop = null; render(); renderOpts(); });
      } else if (t === 'rotate') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-rot]'), function (b) { b.addEventListener('click', function () { rotate(parseInt(b.dataset.rot, 10)); }); });
      } else if (t === 'flip') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-flip]'), function (b) { b.addEventListener('click', function () { flip(b.dataset.flip); }); });
      } else if (t === 'text') {
        txWire();
      } else if (t === 'draw' || t === 'arrow' || t === 'rect' || t === 'circle') {
        on('ieSc', 'input', function (e) { P.color = e.target.value; var a = selObj(); if (a && a.t !== 'text') edit(function () { a.c = P.color; }); });
        on('ieSc', 'change', endEdit);
        on('ieLw', 'input', function (e) { P.lw = +e.target.value; setVal('ieLwV', String(P.lw)); var a = selObj(); if (a && a.t !== 'text') edit(function () { a.lw = lwPx(); }); });
        on('ieLw', 'change', endEdit);
        on('ieFill', 'change', function (e) { P.fill = e.target.checked; var a = selObj(); if (a && a.t !== 'text' && a.t !== 'arrow') { pushHist(); a.fill = P.fill; render(); } });
        on('ieDelSel', 'click', delSel);
        on('ieDelAll', 'click', function () { if (!S.annots.length) return; pushHist(); S.annots = []; S.sel = -1; render(); });
      } else if (t === 'blur') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-bs]'), function (b) {
          b.addEventListener('click', function () { P.blurStyle = b.dataset.bs; Array.prototype.forEach.call(optsEl.querySelectorAll('[data-bs]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); });
        });
        on('ieBr', 'input', function (e) { P.blurStrength = +e.target.value; setVal('ieBrV', String(P.blurStrength)); });
      } else if (t === 'brightness' || t === 'contrast') {
        var key = t === 'brightness' ? 'b' : 'c', sid = t === 'brightness' ? 'ieBri' : 'ieCon';
        on(sid, 'input', function (e) { if (!optEditing) { pushHist(); optEditing = true; } S.adj[key] = +e.target.value; setVal(sid + 'V', String(S.adj[key])); render(); });
        on(sid, 'change', endEdit);
        on('ieAdjReset', 'click', function () { if (!S.adj[key]) return; pushHist(); S.adj[key] = 0; renderOpts(); render(); });
      } else if (t === 'image') {
        on('ieImgPick', 'click', function () { $('ieImgFile').click(); });
        on('ieImgFile', 'change', function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          var u = URL.createObjectURL(f), im = new Image();
          im.onload = function () {
            pushHist();
            var id = 'i' + (++imgSeq); IMGS[id] = im;
            var w = S.base.width * P.imgSize / 100, h = w * im.naturalHeight / im.naturalWidth;
            S.annots.push({ t: 'img', id: id, x: (S.base.width - w) / 2, y: (S.base.height - h) / 2, w: w, h: h, o: P.imgOpacity });
            S.sel = S.annots.length - 1; renderOpts(); render();
          };
          im.onerror = function () { say('Could not open that image.'); };
          im.src = u; e.target.value = '';
        });
        on('ieImgS', 'input', function (e) {
          P.imgSize = +e.target.value; setVal('ieImgSV', Math.round(P.imgSize) + '%');
          var a = selObj();
          if (a && a.t === 'img') edit(function () { var cx = a.x + a.w / 2, cy = a.y + a.h / 2, r = a.h / a.w; a.w = S.base.width * P.imgSize / 100; a.h = a.w * r; a.x = cx - a.w / 2; a.y = cy - a.h / 2; });
        });
        on('ieImgS', 'change', endEdit);
        on('ieImgO', 'input', function (e) {
          P.imgOpacity = +e.target.value; setVal('ieImgOV', Math.round(P.imgOpacity) + '%');
          var a = selObj(); if (a && a.t === 'img') edit(function () { a.o = P.imgOpacity; });
        });
        on('ieImgO', 'change', endEdit);
        on('ieDelSel', 'click', delSel);
      } else if (t === 'sticker') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-sc]'), function (b) {
          b.addEventListener('click', function () { stickerCategory = b.dataset.sc; renderOpts(); });
        });
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-sticker]'), function (b) {
          b.addEventListener('click', function () {
            pushHist();
            var emoji = b.dataset.sticker, size = S.base.width * (+(($('ieStickerSize') || {}).value || 12)) / 100;
            var a = { t: 'text', x: 0, y: 0, s: size, c: '#ffffff', b: false, text: emoji };
            var box = textBox(a); a.x = (S.base.width - box.w) / 2; a.y = (S.base.height - box.h) / 2;
            S.annots.push(a); S.sel = S.annots.length - 1; render();
          });
        });
      } else if (t === 'watermark') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-wt]'), function (b) { b.addEventListener('click', function () { if (S.wm.type !== b.dataset.wt) { pushHist(); S.wm.type = b.dataset.wt; S.wm.on = S.wm.type === 'text' ? !!S.wm.text : !!S.wm.img; renderOpts(); render(); } }); });
        on('ieWmT', 'input', function (e) { if (!optEditing) { pushHist(); optEditing = true; } S.wm.text = e.target.value; S.wm.on = !!S.wm.text; var c = $('ieWmOn'); if (c) c.checked = S.wm.on; render(); });
        on('ieWmT', 'change', endEdit);
        on('ieWmC', 'input', function (e) { if (!optEditing) { pushHist(); optEditing = true; } S.wm.color = e.target.value; render(); });
        on('ieWmC', 'change', endEdit);
        on('ieWmPick', 'click', function () { $('ieWmFile').click(); });
        on('ieWmFile', 'change', function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          var u = URL.createObjectURL(f), im = new Image();
          im.onload = function () { pushHist(); S.wm.img = im; S.wm.on = true; renderOpts(); render(); };
          im.onerror = function () { say('Could not open that logo image.'); };
          im.src = u;
        });
        on('ieWmS', 'input', function (e) { if (!optEditing) { pushHist(); optEditing = true; } S.wm.size = +e.target.value; setVal('ieWmSV', S.wm.size + '%'); render(); });
        on('ieWmS', 'change', endEdit);
        on('ieWmO', 'input', function (e) { if (!optEditing) { pushHist(); optEditing = true; } S.wm.opacity = +e.target.value; setVal('ieWmOV', S.wm.opacity + '%'); render(); });
        on('ieWmO', 'change', endEdit);
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-wp]'), function (b) {
          b.addEventListener('click', function () { pushHist(); S.wm.pos = b.dataset.wp; Array.prototype.forEach.call(optsEl.querySelectorAll('[data-wp]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); render(); });
        });
        on('ieWmOn', 'change', function (e) { pushHist(); S.wm.on = e.target.checked; render(); });
      }
    }
    function delSel() { if (S.sel < 0) return; stopTyping(); pushHist(); S.annots.splice(S.sel, 1); S.sel = -1; renderOpts(); render(); }

    // ---------------------------------------------------------------- export
    function renderFull(jpg) {
      var out = newCanvas(S.base.width, S.base.height), x = out.getContext('2d');
      if (jpg) { x.fillStyle = '#fff'; x.fillRect(0, 0, out.width, out.height); }
      x.drawImage(S.base, 0, 0);
      applyAdj(x, out.width, out.height, S.adj.b, S.adj.c);
      drawAnnots(x, S.annots, false);
      drawWm(x, out.width, out.height);
      return out;
    }
    function shareFile(b, name) {
      if (window.LovePDFiShare) return window.LovePDFiShare.file(b, name);
      try {
        var f = new File([b], name, { type: b.type });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [f] }))
          return navigator.share({ files: [f], title: name }).then(function () { return true; }, function (e) { return !!(e && e.name === 'AbortError'); });
      } catch (e) { /* not supported */ }
      return Promise.resolve(false);
    }
    function save(share) {
      if (!S.base) return;
      share = share === true;
      var fmt = P.fmt, mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png', ext = fmt === 'jpeg' ? 'jpg' : fmt;
      var out = renderFull(fmt === 'jpeg');
      infoEl.textContent = 'Preparing…';
      out.toBlob(function (b) {
        if (!b) { infoEl.textContent = 'Could not save this image. Try PNG or a smaller photo.'; return; }
        var fname = S.name + '-edited.' + ext;
        var sizeTxt = b.size >= 1048576 ? (b.size / 1048576).toFixed(2) + ' MB' : Math.round(b.size / 1024) + ' KB';
        var shareP = share ? shareFile(b, fname) : Promise.resolve(false);
        shareP.then(function (shared) {
          if (!shared) {
            var a = document.createElement('a'), u = URL.createObjectURL(b);
            a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
            if (share && window.LovePDFiShare) window.LovePDFiShare.toast(window.LovePDFiShare.fallbackNote);
          }
          infoEl.textContent = (shared ? '✓ Shared ' : '✓ Saved ') + out.width + '×' + out.height + ' px · ' + sizeTxt + ' · ' + ext.toUpperCase();
          doneEl.querySelector('strong').textContent = shared ? '✓ Shared' : '✓ Download started';
          $('ieDoneT').textContent = fname + ' · ' + sizeTxt + (shared ? '' : ' — check your Downloads folder.');
          doneEl.hidden = false;
          // Hook for the storage backend (to be connected later)
          var meta = { name: fname, format: ext, width: out.width, height: out.height, size: b.size };
          try { if (window.LovePDFiStorage && typeof window.LovePDFiStorage.save === 'function') window.LovePDFiStorage.save(b, meta); } catch (x) { /* ignore */ }
          try { root.dispatchEvent(new CustomEvent('lovepdfi:edited-image', { bubbles: true, detail: { blob: b, meta: meta } })); } catch (x) { /* ignore */ }
        });
      }, mime, fmt === 'png' ? undefined : P.q / 100);
    }


    // ---------------------------------------------------------------- full-screen editing window
    // Tapping a tool opens a full-screen window: the picture on top, the options of THAT tool at the bottom (no scrolling).
    // With several gallery images the ‹ › buttons go to the previous / next image and keep the current tool.
    function fitViewport() {      // keeps the window above the phone keyboard (Text tool)
      if (!imm) return;
      var vv = window.visualViewport;
      if (vv) { workEl.style.top = vv.offsetTop + 'px'; workEl.style.height = vv.height + 'px'; workEl.style.bottom = 'auto'; }
    }
    function enterImm() {
      if (imm || !S.base) return;
      imm = true; ieEl.classList.add('ie-imm'); document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
      fitViewport(); updateNav();
      window.requestAnimationFrame(function () { if (imm && S.base) { layout(); render(); } });
    }
    function exitImm() {
      if (!imm) return;
      if (S.tool === 'crop' && crop && crop.w > 2 && crop.h > 2) applyCrop();   // Done keeps a crop frame that is on the picture
      imm = false; ieEl.classList.remove('ie-imm');
      workEl.style.top = ''; workEl.style.height = ''; workEl.style.bottom = '';
      document.documentElement.style.overflow = ''; document.body.style.overflow = '';
      setTool(null);
      if (shared) flush();
      window.setTimeout(function () { revealEditor(); }, 60);
    }
    function galCount() { return shared && G.count ? G.count() : 1; }
    function updateNav() {
      var nav = $('ieNav'); if (!nav) return;
      var n = galCount(); nav.hidden = n < 2; var tt = $('ieTitle'); if (tt) tt.style.display = n > 1 ? 'none' : '';   // the tool strip already shows the tool; the title is only for a single image
      if (n > 1) { var i = G.index(); $('iePos').textContent = (i + 1) + ' / ' + n; $('iePrev').disabled = i <= 0; $('ieNext').disabled = i >= n - 1; }
    }
    function goImage(d) {
      if (!shared || !G.select) return;
      var i = G.index() + d; if (i < 0 || i >= G.count()) return;
      G.select(i);   // the gallery announces the change; the editor then loads that image and keeps the tool
      window.setTimeout(updateNav, 80);
    }


    // ---------------------------------------------------------------- text tool: behaviour
    var TSKEYS = ['f', 'b', 'i', 'u', 'al', 'c', 'g', 'sk', 'skc', 'sh', 'shc', 'shb', 'bg', 'bga', 'ls', 'lh', 'skw', 'op'];
    var SW = ['#ffffff', '#000000', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a', '#795548'];
    function selText() { var a = S.sel >= 0 ? S.annots[S.sel] : null; return a && a.t === 'text' ? a : null; }
    function syncStyleFromSel() {
      var a = selText(); if (!a) return;
      TSKEYS.forEach(function (k) { if (a[k] !== undefined) P.ts[k] = a[k]; });
      if (a.bg) P.ts.bgc = a.bg;
      P.textSize = a.s / S.base.width * 100;
    }
    function setTopDone(typing) { var d = $('ieTopDone'); if (d) d.textContent = typing ? '✓ OK' : '✓ Done'; }
    function stopTyping() {           // leave typing mode without any clean-up (used when the text is deleted / undone / replaced)
      var was = txEditing; txEditing = false; clearInterval(caretT); ieEl.classList.remove('ie-typing'); setTopDone(false);
      var ta = $('ieTxIn'); if (was && ta) ta.blur();
    }
    function blurTx() { var ta = $('ieTxIn'); if (txEditing && ta) ta.blur(); }
    function onTxBlur() {
      if (!txEditing) return;
      txEditing = false; clearInterval(caretT); ieEl.classList.remove('ie-typing'); setTopDone(false); endEdit();
      var a = selText();
      if (a && !String(a.text || '').length) { S.annots.splice(S.sel, 1); S.sel = -1; if (txNewHist) { hist.pop(); syncHist(); } }   // an empty box is not kept
      txNewHist = false; renderOpts(); render();
      window.requestAnimationFrame(function () { if (imm && S.base) { layout(); render(); } });
    }
    function focusTx(isNew) {
      var a = selText(), ta = $('ieTxIn'); if (!a || a.lock || !ta) return;
      if (!isNew) { optEditing = false; txNewHist = false; }
      ta.value = a.text || ''; txEditing = true; ieEl.classList.add('ie-typing'); setTopDone(true);
      try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* ignore */ }
      caretOn = true; clearInterval(caretT); caretT = setInterval(function () { caretOn = !caretOn; if (!drag && txEditing) render(); }, 530);
      window.requestAnimationFrame(function () { if (imm && S.base) { layout(); render(); } });
      render();
    }
    function newText() {
      if (!S.base) return;
      blurTx(); pushHist(); txNewHist = true; optEditing = true;
      var W = S.base.width, H = S.base.height, n = S.annots.filter(function (o) { return o.t === 'text'; }).length;
      var o = { t: 'text', x: 0, y: 0, s: W * (P.textSize || 7) / 100, text: '' };
      TSKEYS.forEach(function (k) { if (P.ts[k] !== undefined) o[k] = P.ts[k]; });
      recenter(o, { x: W / 2 + n * W * 0.03, y: H / 2 + n * W * 0.03 });
      S.annots.push(o); S.sel = S.annots.length - 1; renderOpts(); render(); focusTx(true);
    }
    function copyText() {
      var a = selText(); if (!a) return; blurTx(); a = selText(); if (!a) return;
      pushHist(); var o = JSON.parse(JSON.stringify(a)); o.lock = false; o.x += S.base.width * 0.03; o.y += S.base.width * 0.03;
      S.annots.push(o); S.sel = S.annots.length - 1; renderOpts(); render();
    }
    function lockText() { var a = selText(); if (!a) return; pushHist(); a.lock = !a.lock; if (a.lock) blurTx(); renderOpts(); render(); }
    function tSet(patch, once) {      // change style: the selected text and the defaults for the next new text
      Object.keys(patch).forEach(function (k) { P.ts[k] = patch[k]; });
      var a = selText();
      if (!a || a.lock) { render(); return; }
      var apply = function () { var c = centerOf(a); Object.keys(patch).forEach(function (k) { a[k] = patch[k]; }); recenter(a, c); };
      if (once) { pushHist(); apply(); render(); } else edit(apply);
    }
    function startPinch(a) {
      var ks = Object.keys(ptrs), q1 = ptrs[ks[0]], q2 = ptrs[ks[1]]; pushHist();
      drag = { mode: 'pinch', a: a, c: centerOf(a), d0: Math.max(10, Math.hypot(q2.x - q1.x, q2.y - q1.y)), a0: Math.atan2(q2.y - q1.y, q2.x - q1.x), s0: a.s, r0: a.rot || 0 };
    }
    function textDown(p) {
      var a = selText();
      if (Object.keys(ptrs).length >= 2 && a && !a.lock) { startPinch(a); return; }
      var onSel = a && (hitTextBox(a, p, 12 / CK) || txHandle(a, p));
      if (txEditing && !onSel) { blurTx(); a = selText(); }
      if (a && !(txEditing && !onSel)) {
        var h = txHandle(a, p);
        if (h === 'x') { delSel(); return; }
        if (h === 'e') { if (a.lock) say('This text is locked. Tap Unlock to edit it.'); else pendingFocus = true; return; }
        if (h === 'r') {
          if (a.lock) { say('This text is locked. Tap Unlock to resize it.'); return; }
          var pts = txPts(a); pushHist();
          drag = { mode: 'tscale', a: a, c: pts.c, d0: Math.max(1, Math.hypot(p.x - pts.c.x, p.y - pts.c.y)), a0: Math.atan2(p.y - pts.c.y, p.x - pts.c.x), s0: a.s, r0: a.rot || 0 };
          return;
        }
      }
      var hi = -1;
      for (var i = S.annots.length - 1; i >= 0; i--) { var o = S.annots[i]; if (o.t === 'text' && hitTextBox(o, p, 12 / CK)) { hi = i; break; } }
      if (hi >= 0) {
        S.sel = hi; syncStyleFromSel();
        drag = { mode: 'move', ox: p.x, oy: p.y, start: JSON.parse(JSON.stringify(S.annots[hi])), moved: false, text: true };
        renderOpts();
      } else { S.sel = -1; drag = null; renderOpts(); }
    }
    function txFontPane() {
      return '<div class="ie-fonts">' + FONTS.map(function (f) {
        return '<button type="button" class="chip ie-fontchip" data-font="' + f.k + '" aria-pressed="' + (P.ts.f === f.k) + '" style="font-family:' + f.css.replace(/"/g, '&quot;') + '"><b>' + (f.lang === 'ur' ? 'اردو' : 'Aa') + '</b><small>' + f.n + '</small></button>';
      }).join('') + '</div><p class="ie-hint" id="ieFontMsg">Urdu and English fonts. Online fonts need an internet connection the first time.</p>';
    }
    function txOptsHtml() {
      var ts = P.ts, a = selText(), tab = P.ttab || 'font', W = S.base.width, body = '';
      var h = '<div class="ie-txbar"><button type="button" class="chip" id="ieTxNew">＋ New</button>' +
        '<button type="button" class="chip" id="ieTxCopy"' + (a ? '' : ' disabled') + '>⧉ Copy</button>' +
        '<button type="button" class="chip" id="ieTxLock"' + (a ? '' : ' disabled') + '>' + (a && a.lock ? '🔓 Unlock' : '🔒 Lock') + '</button>' +
        '<button type="button" class="chip" id="ieTxDel"' + (a ? '' : ' disabled') + '>🗑 Delete</button></div>' +
        '<div class="ie-txtabs" id="ieTxTabs">' + chips('data-tt', [['font', 'Font'], ['col', 'Colour'], ['stroke', 'Stroke'], ['shadow', 'Shadow'], ['back', 'Box'], ['style', 'Style'], ['space', 'Spacing'], ['tf', 'Size · Rotate']], tab) + '</div>';
      if (tab === 'font') body = txFontPane();
      else if (tab === 'col') {
        body = '<div class="ie-row">' + SW.map(function (c) { return '<button type="button" class="ie-sw" data-tcol="' + c + '" aria-pressed="' + (String(ts.c).toLowerCase() === c) + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('') + '</div>' +
          '<label>Custom <input type="color" id="ieTc" value="' + ts.c + '"></label>' +
          '<label><input type="checkbox" id="ieTg"' + (ts.g ? ' checked' : '') + '> Gradient</label>' + (ts.g ? '<label>2nd colour <input type="color" id="ieTg2" value="' + ts.g[1] + '"></label>' : '');
      } else if (tab === 'stroke') {
        body = slider('ieSk', 'Outline', 0, 30, Math.round((ts.sk || 0) * 100), '%') + '<label>Colour <input type="color" id="ieSkc" value="' + (ts.skc || '#000000') + '"></label>';
      } else if (tab === 'shadow') {
        body = '<label><input type="checkbox" id="ieSh"' + (ts.sh ? ' checked' : '') + '> Shadow</label><label>Colour <input type="color" id="ieShc" value="' + (ts.shc || '#000000') + '"></label>' + slider('ieShb', 'Blur', 0, 40, Math.round((ts.shb == null ? 0.08 : ts.shb) * 100), '%');
      } else if (tab === 'back') {
        body = '<label><input type="checkbox" id="ieBg"' + (ts.bg ? ' checked' : '') + '> Box behind text</label><label>Colour <input type="color" id="ieBgc" value="' + (ts.bgc || '#000000') + '"></label>' + slider('ieBga', 'Opacity', 10, 100, Math.round((ts.bga == null ? 0.6 : ts.bga) * 100), '%');
      } else if (tab === 'style') {
        body = '<div class="ie-row">' + [['b', '<b>B</b>'], ['i', '<i>I</i>'], ['u', '<u>U</u>']].map(function (x) { return '<button type="button" class="chip" data-tf="' + x[0] + '" aria-pressed="' + (!!ts[x[0]]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          '<div class="ie-row">' + chips('data-al', [['left', '⇤ Left'], ['center', '↔ Centre'], ['right', 'Right ⇥']], ts.al || 'left') + '</div>';
      } else if (tab === 'space') {
        body = slider('ieLs', 'Letters', -5, 40, Math.round((ts.ls || 0) * 100), '%') + slider('ieLh', 'Lines', 80, 300, Math.round((ts.lh || fontDef({ f: ts.f }).lh) * 100), '%');
      } else {
        var size = a ? a.s / W * 100 : P.textSize, rot = a ? (((a.rot || 0) * 180 / Math.PI) % 360 + 360) % 360 : 0;
        body = slider('ieTs', 'Size', 2, 40, Math.round(size), '%') + slider('ieRot', 'Rotate', 0, 360, Math.round(rot), '°') + slider('ieSkw', 'Slant', -45, 45, Math.round(ts.skw || 0), '°') + slider('ieOp', 'Opacity', 10, 100, Math.round(ts.op == null ? 100 : ts.op), '%');
      }
      return h + '<div class="ie-txpane">' + body + '</div><p class="ie-hint">' + (a ? 'Tap the box to type. Drag it to move. Drag ↘ to resize and rotate, or pinch with two fingers.' : 'Tap ＋ New to add text on the photo.') + '</p>';
    }
    function txWire() {
      on('ieTxNew', 'click', newText); on('ieTxCopy', 'click', copyText); on('ieTxLock', 'click', lockText); on('ieTxDel', 'click', delSel);
      Array.prototype.forEach.call(optsEl.querySelectorAll('[data-tt]'), function (b) { b.addEventListener('click', function () { P.ttab = b.dataset.tt; renderOpts(); }); });
      Array.prototype.forEach.call(optsEl.querySelectorAll('[data-font]'), function (b) {
        previewFont(FONTS.filter(function (f) { return f.k === b.dataset.font; })[0]);
        b.addEventListener('click', function () {
          var f = FONTS.filter(function (x) { return x.k === b.dataset.font; })[0], msg = $('ieFontMsg');
          tSet({ f: f.k, lh: 0 }, true);
          Array.prototype.forEach.call(optsEl.querySelectorAll('[data-font]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          if (f.g && msg) msg.textContent = 'Loading ' + f.n + '…';
          useFont(f, function (ok) { if (msg) msg.textContent = ok ? (f.g ? f.n + ' is ready.' : '') : 'Could not load ' + f.n + ' (no internet?). A similar font is used.'; var a = selText(); if (a) { var c = centerOf(a); recenter(a, c); } render(); });
        });
      });
      Array.prototype.forEach.call(optsEl.querySelectorAll('[data-tcol]'), function (b) { b.addEventListener('click', function () { var c = b.dataset.tcol; tSet({ c: c, g: P.ts.g ? [c, P.ts.g[1]] : null }, true); renderOpts(); }); });
      on('ieTc', 'input', function (e) { var c = e.target.value; tSet({ c: c, g: P.ts.g ? [c, P.ts.g[1]] : null }); }); on('ieTc', 'change', endEdit);
      on('ieTg', 'change', function (e) { tSet({ g: e.target.checked ? [P.ts.c, '#ffd54f'] : null }, true); renderOpts(); });
      on('ieTg2', 'input', function (e) { tSet({ g: [P.ts.c, e.target.value] }); }); on('ieTg2', 'change', endEdit);
      on('ieSk', 'input', function (e) { var v = +e.target.value; setVal('ieSkV', v + '%'); tSet({ sk: v / 100 }); }); on('ieSk', 'change', endEdit);
      on('ieSkc', 'input', function (e) { tSet({ skc: e.target.value, sk: P.ts.sk || 0.08 }); }); on('ieSkc', 'change', endEdit);
      on('ieSh', 'change', function (e) { tSet({ sh: e.target.checked ? 1 : 0 }, true); });
      on('ieShc', 'input', function (e) { tSet({ shc: e.target.value, sh: 1 }); }); on('ieShc', 'change', endEdit);
      on('ieShb', 'input', function (e) { var v = +e.target.value; setVal('ieShbV', v + '%'); tSet({ shb: v / 100, sh: 1 }); }); on('ieShb', 'change', endEdit);
      on('ieBg', 'change', function (e) { tSet({ bg: e.target.checked ? (P.ts.bgc || '#000000') : '' }, true); });
      on('ieBgc', 'input', function (e) { P.ts.bgc = e.target.value; tSet({ bg: e.target.value }); }); on('ieBgc', 'change', endEdit);
      on('ieBga', 'input', function (e) { var v = +e.target.value; setVal('ieBgaV', v + '%'); tSet({ bga: v / 100 }); }); on('ieBga', 'change', endEdit);
      Array.prototype.forEach.call(optsEl.querySelectorAll('[data-tf]'), function (b) { b.addEventListener('click', function () { var k = b.dataset.tf, v = P.ts[k] ? 0 : 1, patch = {}; patch[k] = v; tSet(patch, true); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); });
      Array.prototype.forEach.call(optsEl.querySelectorAll('[data-al]'), function (b) { b.addEventListener('click', function () { tSet({ al: b.dataset.al }, true); Array.prototype.forEach.call(optsEl.querySelectorAll('[data-al]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }); });
      on('ieLs', 'input', function (e) { var v = +e.target.value; setVal('ieLsV', v + '%'); tSet({ ls: v / 100 }); }); on('ieLs', 'change', endEdit);
      on('ieLh', 'input', function (e) { var v = +e.target.value; setVal('ieLhV', v + '%'); tSet({ lh: v / 100 }); }); on('ieLh', 'change', endEdit);
      on('ieTs', 'input', function (e) { var v = +e.target.value; setVal('ieTsV', v + '%'); P.textSize = v; var a = selText(); if (a && !a.lock) edit(function () { var c = centerOf(a); a.s = S.base.width * v / 100; recenter(a, c); }); }); on('ieTs', 'change', endEdit);
      on('ieRot', 'input', function (e) { var v = +e.target.value; setVal('ieRotV', v + '°'); var a = selText(); if (a && !a.lock) edit(function () { a.rot = v * Math.PI / 180; }); }); on('ieRot', 'change', endEdit);
      on('ieSkw', 'input', function (e) { var v = +e.target.value; setVal('ieSkwV', v + '°'); tSet({ skw: v }); }); on('ieSkw', 'change', endEdit);
      on('ieOp', 'input', function (e) { var v = +e.target.value; setVal('ieOpV', v + '%'); tSet({ op: v }); }); on('ieOp', 'change', endEdit);
    }
    (function () {
      var ta = $('ieTxIn'); if (!ta) return;
      ta.addEventListener('input', function () {
        var a = selText(); if (!a || a.lock) return;
        if (!optEditing) { pushHist(); optEditing = true; }
        var c = centerOf(a); a.text = ta.value; recenter(a, c); caretOn = true; render();
      });
      ta.addEventListener('blur', onTxBlur);
      ta.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); ta.blur(); } });
      document.addEventListener('selectionchange', function () { if (txEditing && document.activeElement === ta) { caretOn = true; render(); } });
    })();

    // ---------------------------------------------------------------- wiring
    var tb = $('ieTools');
    TOOLS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.t = t[0]; b.setAttribute('aria-pressed', 'false');
      var sp = t[1].indexOf(' '), ic = document.createElement('span'), lb = document.createElement('span');
      ic.className = 'ie-ti'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = t[1].slice(0, sp); lb.textContent = t[1].slice(sp + 1);
      b.appendChild(ic); b.appendChild(lb);
      b.addEventListener('click', function () {
        enterImm(); setTool(t[0]);
        if (t[0] === 'text' && S.base && !S.annots.some(function (o) { return o.t === 'text'; })) newText();   // a first box appears at once
      });
      tb.appendChild(b);
    });
    $('ieSel').addEventListener('click', function () { $('ieFile').click(); });
    $('ieCam').addEventListener('click', function () { $('ieCamFile').click(); });
    $('ieChange').addEventListener('click', function () { $('ieFile').click(); });
    $('ieCancel').addEventListener('click', function () { S.base = null; S.orig = null; S.annots = []; S.sel = -1; hist = []; redo = []; workEl.hidden = true; $('ieResumeRow').hidden = true; say('Editor cleared. Select an image or take a photo to begin.'); if (shared && G && typeof G.getSelected === 'function') { try { var selected = G.getSelected(); if (selected && selected.id != null) { S.itemId = selected.id; } } catch (e) {} } });
    $('ieFile').addEventListener('change', function (e) { loadFile(e.target.files && e.target.files[0]); e.target.value = ''; });
    $('ieCamFile').addEventListener('change', function (e) { loadFile(e.target.files && e.target.files[0]); e.target.value = ''; });
    var dz = $('ieDrop');
    dz.addEventListener('click', function () { $('ieFile').click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('ieFile').click(); } });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); });
    dz.addEventListener('drop', function (e) { e.preventDefault(); loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    $('ieUndo').addEventListener('click', undo);
    $('ieRedo').addEventListener('click', redoOp);
    $('ieReset').addEventListener('click', resetAll);
    $('ieRotate').addEventListener('click', function () { if (S.base) rotate(1); });
    $('ieTopDone').addEventListener('click', function () { if (txEditing) { blurTx(); return; } exitImm(); });
    ['mousedown', 'touchstart'].forEach(function (ev) { $('ieTop').addEventListener(ev, function (e) { if (txEditing && e.cancelable) e.preventDefault(); }, { passive: false }); });
    $('ieTopUndo').addEventListener('click', undo);
    $('ieTopRedo').addEventListener('click', redoOp);
    $('ieTopRot').addEventListener('click', function () { if (S.base) rotate(1); });
    $('iePrev').addEventListener('click', function () { goImage(-1); });
    $('ieNext').addEventListener('click', function () { goImage(1); });
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitViewport); window.visualViewport.addEventListener('scroll', fitViewport); }
    if (window.ResizeObserver && stageEl) { var roT = 0; new ResizeObserver(function () { if (!imm || !S.base) return; cancelAnimationFrame(roT); roT = requestAnimationFrame(function () { layout(); render(); }); }).observe(stageEl); }
    $('ieSaveKeep').addEventListener('click', function () {
      if (!S.base) return;
      clearTimeout(saveT); saveT = null; autoDirty = true; autoEl.textContent = 'Saving…';
      autoSave();   // shared mode: writes into the gallery; standalone: saves a draft on this device
    });
    $('ieSave').addEventListener('click', function () { save(false); });
    $('ieAgain').addEventListener('click', function () { save(false); });
    $('ieShare').addEventListener('click', function () { save(true); });
    $('ieShareAgain').addEventListener('click', function () { save(true); });
    $('ieKeep').addEventListener('click', function () { doneEl.hidden = true; });
    var draftData = null;
    if (!shared) dbGet().then(function (d) { if (d && d.cur) { draftData = d; $('ieResumeRow').hidden = false; } }).catch(function () { /* no saved draft */ });
    $('ieResume').addEventListener('click', function () { if (draftData) loadFile(draftData.cur, draftData); });
    Array.prototype.forEach.call($('ieFmt').children, function (b) {
      b.addEventListener('click', function () {
        P.fmt = b.dataset.f;
        Array.prototype.forEach.call($('ieFmt').children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('ieQrow').hidden = P.fmt === 'png';
      });
    });
    $('ieQ').addEventListener('input', function (e) { P.q = +e.target.value; $('ieQv').textContent = P.q + '%'; });

    document.addEventListener('keydown', function (e) {
      if (!S.base || !shown()) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (imm) { if (e.key === 'Escape') { e.preventDefault(); exitImm(); return; } if (e.key === 'ArrowLeft') { goImage(-1); return; } if (e.key === 'ArrowRight') { goImage(1); return; } }
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel >= 0) { e.preventDefault(); delSel(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redoOp(); }
    });
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (S.base && shown()) { layout(); render(); } }, 120); });

    if (shared) {
      inst = { refresh: syncFromGallery, flush: flush };
      inst.startTool = function (t) { root.dataset.startTool = t || ''; if (S.base && shown()) setTool(t || null); };
      G.onChange(function (c) {
        if (S.writing && c && c.id === S.itemId) return;   // our own write-back
        if (!shown()) return;           // Edit tab hidden: refreshed when it is shown
        syncFromGallery();
      });
      syncFromGallery();
    }

    // Small read-only hook used by automated tests
    root._ie = { texts: function () { return S.annots.filter(function (a) { return a.t === 'text'; }).map(function (a) { return JSON.parse(JSON.stringify(a)); }); }, geom: function () { var a = selText(); if (!a) return null; var pts = txPts(a), r = cv.getBoundingClientRect(); function c(q) { return [r.left + q.x * CK, r.top + q.y * CK]; } return { x: c(pts.x), e: c(pts.e), r: c(pts.r), c: c(pts.c) }; }, typing: function () { return txEditing; }, sel: function () { return S.sel; },
      state: function () { return { w: S.base && S.base.width, h: S.base && S.base.height, annots: S.annots.length, tool: S.tool, adj: S.adj, overlays: S.annots.filter(function (a) { return a.t === 'img'; }).length, wm: S.wm.on, hist: hist.length, crop: crop && { x: crop.x, y: crop.y, w: crop.w, h: crop.h } }; } };
  }

  var inst = null;
  window.LovePDFiEditor = { mount: mount, refresh: function () { if (inst) inst.refresh(); }, flush: function () { return inst ? inst.flush() : Promise.resolve(); }, startTool: function (t) { if (inst && inst.startTool) inst.startTool(t); } };
  var r = document.getElementById('imgEditorRoot');
  if (r) mount(r);
})();
