/* LovePDFi Image Editor
 * Loaded on demand by tools.js the first time the "Edit" tab is opened.
 * Everything runs in the browser; the photo never leaves the device.
 * Tools: Crop, Rotate, Flip, Text, Arrow, Rectangle, Circle, Blur, Brightness, Contrast, Watermark.
 */
(function () {
  'use strict';
  if (window.LovePDFiEditor) return;

  var MAX_SIDE = 3200;   // photos larger than this are reduced for smooth editing
  var HIST = 8;          // undo steps

  var CSS = [
    '.ie [hidden]{display:none!important}',
    '.ie-note{text-align:center;margin:0 0 12px}',
    '.ie-toolbar{display:flex;gap:8px;overflow-x:auto;padding:6px 2px 10px;margin:12px 0 0;-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
    '.ie-toolbar .chip{flex:0 0 auto;white-space:nowrap}',
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
    '.ie-info{text-align:center;font-size:13px;color:#667085;margin:6px 0}'
  ].join('\n');

  var TOOLS = [
    ['crop', '✂ Crop'], ['rotate', '↻ Rotate'], ['flip', '⇋ Flip'], ['text', 'T Text'], ['arrow', '➚ Arrow'],
    ['rect', '▭ Rectangle'], ['circle', '◯ Circle'], ['blur', '▒ Blur'], ['brightness', '☀ Brightness'],
    ['contrast', '◐ Contrast'], ['watermark', '© Watermark']
  ];

  var TEMPLATE =
    '<div class="ie">' +
    '<p class="sub ie-note">Edit one photo: crop, rotate, flip, add text and shapes, blur private details, adjust brightness and contrast, and add a watermark. Everything stays on your device.</p>' +
    '<div class="actions"><button type="button" class="btn" id="ieSel">⬆ Select image</button><button type="button" class="btn" id="ieCam">📷 Take photo</button></div>' +
    '<input type="file" id="ieFile" accept="image/*,.heic,.heif" hidden>' +
    '<input type="file" id="ieCamFile" accept="image/*" capture="environment" hidden>' +
    '<div class="drop" id="ieDrop" tabindex="0" role="button" aria-label="Choose an image to edit">Or drop an image here<br><small>JPG, PNG, WebP or HEIC · one photo at a time</small></div>' +
    '<p class="ie-hint" id="ieMsg" role="status" hidden></p>' +
    '<div id="ieWork" hidden>' +
    '<div class="ie-toolbar" id="ieTools" role="toolbar" aria-label="Editing tools"></div>' +
    '<div class="ie-stagewrap"><div class="ie-stage"><canvas id="ieCv" aria-label="Image being edited"></canvas></div></div>' +
    '<div class="ie-opts" id="ieOpts"></div>' +
    '<div class="ie-row" id="ieHistory">' +
    '<button type="button" class="chip" id="ieUndo" disabled>↶ Undo</button>' +
    '<button type="button" class="chip" id="ieRedo" disabled>↷ Redo</button>' +
    '<button type="button" class="chip" id="ieReset">⟲ Restore original</button>' +
    '<button type="button" class="chip" id="ieChange">⬆ Change image</button></div>' +
    '<div class="ie-row" role="group" aria-label="Save as"><span style="font-weight:500">Save as:</span><div class="seg" id="ieFmt">' +
    '<button type="button" data-f="png" aria-pressed="true">PNG</button><button type="button" data-f="jpeg" aria-pressed="false">JPG</button><button type="button" data-f="webp" aria-pressed="false">WebP</button></div></div>' +
    '<div class="ie-row" id="ieQrow" hidden><label>Quality <input type="range" id="ieQ" min="40" max="100" value="92"> <span class="ie-val" id="ieQv">92%</span></label></div>' +
    '<div class="ie-row"><button type="button" class="btn dl" id="ieSave">⬇ Download edited image</button></div>' +
    '<p class="ie-info" id="ieInfo" role="status"></p>' +
    '</div></div>';

  function mount(root) {
    if (!root || root.dataset.ieMounted) return;
    root.dataset.ieMounted = '1';

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root.innerHTML = TEMPLATE;

    function $(id) { return root.querySelector('#' + id); }
    var cv = $('ieCv'), optsEl = $('ieOpts'), workEl = $('ieWork'), msgEl = $('ieMsg'), infoEl = $('ieInfo');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ---------------------------------------------------------------- state
    var S = { base: null, orig: null, annots: [], sel: -1, adj: { b: 0, c: 0 }, wm: newWm(), name: 'photo', tool: 'crop' };
    var P = { aspect: null, color: '#e53935', lw: 6, fill: false, text: '', textColor: '#ffffff', textSize: 7, bold: true,
              blurStyle: 'blur', blurStrength: 14, fmt: 'png', q: 92 };
    var hist = [], redo = [];
    var crop = null, drag = null, tmp = null, blurRect = null;
    var K = 1, CK = 1, view = null, viewKey = '', baseId = 0, optEditing = false;

    function newWm() { return { on: false, type: 'text', text: '', color: '#ffffff', size: 8, opacity: 55, pos: 'br', img: null }; }
    function cloneWm(w) { return { on: w.on, type: w.type, text: w.text, color: w.color, size: w.size, opacity: w.opacity, pos: w.pos, img: w.img }; }
    function newCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); c._id = ++baseId; return c; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function say(t) { msgEl.hidden = !t; msgEl.textContent = t || ''; }

    // ---------------------------------------------------------------- loading
    async function loadFile(file) {
      if (!file) return;
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
        var url = URL.createObjectURL(file);
        var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('img')); }; i.src = url; });
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, MAX_SIDE / Math.max(w, h));
        var c = newCanvas(w * s, h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        S.orig = c;
        S.base = c;
        S.annots = []; S.sel = -1; S.adj = { b: 0, c: 0 }; S.wm = newWm();
        S.name = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
        hist = []; redo = []; crop = null; tmp = null; blurRect = null;
        workEl.hidden = false;
        say(s < 1 ? 'Large photo reduced to ' + c.width + '×' + c.height + ' for smooth editing.' : '');
        setTool('crop');
        syncHist();
        infoEl.textContent = '';
      } catch (e) {
        say(e && e.message === 'heic'
          ? 'This is an iPhone (HEIC) photo. Please convert it first in the “iPhone (HEIC)” tab, then edit it here.'
          : 'Could not open this image. Please try another JPG, PNG or WebP file.');
      }
    }

    // ---------------------------------------------------------------- history
    function snapshot() { return { base: S.base, annots: JSON.parse(JSON.stringify(S.annots)), adj: { b: S.adj.b, c: S.adj.c }, wm: cloneWm(S.wm) }; }
    function pushHist() { hist.push(snapshot()); if (hist.length > HIST) hist.shift(); redo = []; syncHist(); }
    function restore(s) {
      S.base = s.base; S.annots = s.annots; S.adj = s.adj; S.wm = s.wm; S.sel = -1; crop = null; tmp = null;
      if (S.tool === 'crop') initCrop();
      layout(); render(); renderOpts(); syncHist();
    }
    function undo() { if (!hist.length) return; redo.push(snapshot()); restore(hist.pop()); }
    function redoOp() { if (!redo.length) return; hist.push(snapshot()); restore(redo.pop()); }
    function syncHist() { $('ieUndo').disabled = !hist.length; $('ieRedo').disabled = !redo.length; }
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
      var wrapW = (root.clientWidth || 340) - 44;
      var availW = clamp(wrapW, 220, 980);
      var availH = clamp(window.innerHeight * 0.68, 260, 760);
      var s = Math.min(availW / S.base.width, availH / S.base.height, 1.5);
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

    var mctx = document.createElement('canvas').getContext('2d');
    function fontOf(a) { return (a.b ? 'bold ' : '') + a.s + 'px sans-serif'; }
    function textBox(a) {
      mctx.font = fontOf(a);
      var lines = String(a.text).split('\n'), w = 0;
      lines.forEach(function (l) { w = Math.max(w, mctx.measureText(l).width); });
      return { x: a.x, y: a.y, w: w, h: lines.length * a.s * 1.2 };
    }

    function drawAnnots(ctx, list, ui) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      list.forEach(function (a, i) {
        drawOne(ctx, a);
        if (ui && i === S.sel) outline(ctx, a);
      });
      ctx.restore();
    }
    function drawOne(ctx, a) {
      if (a.t === 'text') {
        ctx.font = fontOf(a); ctx.textBaseline = 'top'; ctx.fillStyle = a.c;
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = Math.max(1, a.s * 0.08);
        String(a.text).split('\n').forEach(function (l, i) { ctx.fillText(l, a.x, a.y + i * a.s * 1.2); });
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
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
      if (a.t === 'arrow') return { x: Math.min(a.x1, a.x2), y: Math.min(a.y1, a.y2), w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1) };
      return { x: Math.min(a.x, a.x + a.w), y: Math.min(a.y, a.y + a.h), w: Math.abs(a.w), h: Math.abs(a.h) };
    }
    function outline(ctx, a) {
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
      S.tool = t; S.sel = -1; tmp = null; blurRect = null; crop = null;
      Array.prototype.forEach.call($('ieTools').children, function (b) { b.setAttribute('aria-pressed', b.dataset.t === t ? 'true' : 'false'); });
      cv.style.touchAction = (t === 'crop' || t === 'text' || t === 'arrow' || t === 'rect' || t === 'circle' || t === 'blur') ? 'none' : 'pan-y';
      cv.style.cursor = t === 'crop' || t === 'blur' || t === 'arrow' || t === 'rect' || t === 'circle' ? 'crosshair' : t === 'text' ? 'text' : 'default';
      if (t === 'crop') initCrop();
      layout(); render(); renderOpts();
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
      S.base = c; initCrop(); layout(); render(); renderOpts();
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
        else if (a.t === 'text') { if (p.x >= b.x - tol / 2 && p.x <= b.x + b.w + tol / 2 && p.y >= b.y - tol / 2 && p.y <= b.y + b.h + tol / 2) return i; }
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
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      if (t === 'crop') {
        var cx = [[crop.x, crop.y], [crop.x + crop.w, crop.y], [crop.x, crop.y + crop.h], [crop.x + crop.w, crop.y + crop.h]], best = -1, bd = 28 / CK;
        cx.forEach(function (c, i) { var d = Math.hypot(p.x - c[0], p.y - c[1]); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { var opp = cx[3 - best]; drag = { mode: 'corner', ax: opp[0], ay: opp[1] }; }
        else if (p.x >= crop.x && p.x <= crop.x + crop.w && p.y >= crop.y && p.y <= crop.y + crop.h) drag = { mode: 'move', ox: p.x - crop.x, oy: p.y - crop.y };
        else drag = { mode: 'corner', ax: p.x, ay: p.y };
      } else if (t === 'blur') {
        drag = { mode: 'blur', x0: p.x, y0: p.y }; blurRect = { x: p.x, y: p.y, w: 0, h: 0 };
      } else if (t === 'text' || t === 'arrow' || t === 'rect' || t === 'circle') {
        var h = hit(p);
        if (h >= 0) {
          S.sel = h; var a = S.annots[h];
          drag = { mode: 'move', ox: p.x, oy: p.y, start: JSON.parse(JSON.stringify(a)), moved: false };
          if (a.t === 'text') { P.text = a.text; P.textColor = a.c; P.bold = !!a.b; P.textSize = a.s / S.base.width * 100; }
          else { P.color = a.c; P.lw = a.lw / Math.max(1, S.base.width / 800); if (a.t !== 'arrow') P.fill = !!a.fill; }
          renderOpts();
        } else if (t === 'text') {
          pushHist();
          var txt = P.text || 'Text';
          S.annots.push({ t: 'text', x: p.x, y: p.y, s: S.base.width * P.textSize / 100, c: P.textColor, b: P.bold, text: txt });
          S.sel = S.annots.length - 1; drag = null; renderOpts();
        } else {
          S.sel = -1; drag = { mode: 'draw', x0: p.x, y0: p.y };
          tmp = t === 'arrow' ? { t: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, c: P.color, lw: lwPx() }
            : { t: t, x: p.x, y: p.y, w: 0, h: 0, c: P.color, lw: lwPx(), fill: P.fill };
        }
      }
      render(); e.preventDefault();
    });

    cv.addEventListener('pointermove', function (e) {
      if (!drag || !S.base) return;
      var p = pt(e), W = S.base.width, H = S.base.height;
      if (drag.mode === 'corner') setCropFromAnchor(drag.ax, drag.ay, clamp(p.x, 0, W), clamp(p.y, 0, H));
      else if (drag.mode === 'move' && S.tool === 'crop') { crop.x = clamp(p.x - drag.ox, 0, W - crop.w); crop.y = clamp(p.y - drag.oy, 0, H - crop.h); }
      else if (drag.mode === 'blur') { blurRect = { x: Math.min(drag.x0, p.x), y: Math.min(drag.y0, p.y), w: Math.abs(p.x - drag.x0), h: Math.abs(p.y - drag.y0) }; }
      else if (drag.mode === 'draw') {
        if (tmp.t === 'arrow') { tmp.x2 = p.x; tmp.y2 = p.y; } else { tmp.w = p.x - drag.x0; tmp.h = p.y - drag.y0; }
      } else if (drag.mode === 'move') {
        var a = S.annots[S.sel], dx = p.x - drag.ox, dy = p.y - drag.oy, s0 = drag.start;
        if (!drag.moved && Math.hypot(dx, dy) * CK < 3) return;
        if (!drag.moved) { drag.moved = true; var keep = S.annots[S.sel]; S.annots[S.sel] = s0; pushHist(); S.annots[S.sel] = keep; }
        if (a.t === 'arrow') { a.x1 = s0.x1 + dx; a.y1 = s0.y1 + dy; a.x2 = s0.x2 + dx; a.y2 = s0.y2 + dy; }
        else { a.x = s0.x + dx; a.y = s0.y + dy; }
      }
      render();
    });

    function endDrag(e) {
      if (!drag) return;
      var d = drag; drag = null;
      try { cv.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      if (d.mode === 'blur') { var r = blurRect; blurRect = null; if (r && r.w * CK > 6 && r.h * CK > 6) applyBlur(r); }
      else if (d.mode === 'draw' && tmp) {
        var big = tmp.t === 'arrow' ? Math.hypot(tmp.x2 - tmp.x1, tmp.y2 - tmp.y1) * CK > 8 : Math.abs(tmp.w) * CK > 6 && Math.abs(tmp.h) * CK > 6;
        if (big) { pushHist(); S.annots.push(tmp); S.sel = S.annots.length - 1; }
        tmp = null; renderOpts();
      }
      render();
    }
    cv.addEventListener('pointerup', endDrag);
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
      if (t === 'crop') {
        h = '<div class="ie-row" id="ieAsp">' + chips('data-ar', [['', 'Free'], ['1', '1:1'], ['1.3333333', '4:3'], ['0.75', '3:4'], ['1.7777778', '16:9'], ['0.5625', '9:16']], P.aspect ? P.aspect : '') + '</div>' +
          '<div class="ie-row"><button type="button" class="btn dl" id="ieCropOk">✓ Crop</button><button type="button" class="btn red" id="ieCropReset">Reset box</button></div>' +
          '<p class="ie-hint">Drag the box or its round corners. Choose a ratio to lock the shape.</p>';
      } else if (t === 'rotate') {
        h = '<div class="ie-row"><button type="button" class="chip" data-rot="-1">↶ Rotate left</button><button type="button" class="chip" data-rot="1">↷ Rotate right</button><button type="button" class="chip" data-rot="2">180°</button></div>';
      } else if (t === 'flip') {
        h = '<div class="ie-row"><button type="button" class="chip" data-flip="h">⇋ Flip horizontal</button><button type="button" class="chip" data-flip="v">⇅ Flip vertical</button></div>';
      } else if (t === 'text') {
        h = '<textarea id="ieTxt" rows="2" placeholder="Type your text, then tap the photo">' + escapeHtml(P.text) + '</textarea>' +
          slider('ieTs', 'Size', 2, 20, Math.round(P.textSize), '%') +
          '<label>Colour <input type="color" id="ieTc" value="' + P.textColor + '"></label>' +
          '<label><input type="checkbox" id="ieTb"' + (P.bold ? ' checked' : '') + '> Bold</label>' +
          '<div class="ie-row"><button type="button" class="chip" id="ieAddCenter">＋ Add text in the middle</button><button type="button" class="chip" id="ieDelSel">🗑 Delete selected</button></div>' +
          '<p class="ie-hint">Tap the photo to place text. Tap text to select it, then drag to move or edit it above.</p>';
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
            refitCrop(); render();
          });
        });
        on('ieCropOk', 'click', applyCrop);
        on('ieCropReset', 'click', function () { initCrop(); render(); });
      } else if (t === 'rotate') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-rot]'), function (b) { b.addEventListener('click', function () { rotate(parseInt(b.dataset.rot, 10)); }); });
      } else if (t === 'flip') {
        Array.prototype.forEach.call(optsEl.querySelectorAll('[data-flip]'), function (b) { b.addEventListener('click', function () { flip(b.dataset.flip); }); });
      } else if (t === 'text') {
        on('ieTxt', 'input', function (e) { P.text = e.target.value; var a = selObj(); if (a && a.t === 'text') edit(function () { a.text = P.text || 'Text'; }); });
        on('ieTxt', 'change', endEdit);
        on('ieTs', 'input', function (e) { P.textSize = +e.target.value; setVal('ieTsV', P.textSize + '%'); var a = selObj(); if (a && a.t === 'text') edit(function () { a.s = S.base.width * P.textSize / 100; }); });
        on('ieTs', 'change', endEdit);
        on('ieTc', 'input', function (e) { P.textColor = e.target.value; var a = selObj(); if (a && a.t === 'text') edit(function () { a.c = P.textColor; }); });
        on('ieTc', 'change', endEdit);
        on('ieTb', 'change', function (e) { P.bold = e.target.checked; var a = selObj(); if (a && a.t === 'text') { pushHist(); a.b = P.bold; render(); } });
        on('ieAddCenter', 'click', function () {
          pushHist();
          var a = { t: 'text', x: 0, y: 0, s: S.base.width * P.textSize / 100, c: P.textColor, b: P.bold, text: P.text || 'Text' }, b = textBox(a);
          a.x = (S.base.width - b.w) / 2; a.y = (S.base.height - b.h) / 2; S.annots.push(a); S.sel = S.annots.length - 1; render();
        });
        on('ieDelSel', 'click', delSel);
      } else if (t === 'arrow' || t === 'rect' || t === 'circle') {
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
    function delSel() { if (S.sel < 0) return; pushHist(); S.annots.splice(S.sel, 1); S.sel = -1; render(); }

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
    function save() {
      if (!S.base) return;
      var fmt = P.fmt, mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png', ext = fmt === 'jpeg' ? 'jpg' : fmt;
      var out = renderFull(fmt === 'jpeg');
      infoEl.textContent = 'Preparing…';
      out.toBlob(function (b) {
        if (!b) { infoEl.textContent = 'Could not save this image. Try PNG or a smaller photo.'; return; }
        var a = document.createElement('a'), u = URL.createObjectURL(b);
        a.href = u; a.download = S.name + '-edited.' + ext; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        infoEl.textContent = '✓ Saved ' + out.width + '×' + out.height + ' px · ' + (b.size >= 1048576 ? (b.size / 1048576).toFixed(2) + ' MB' : Math.round(b.size / 1024) + ' KB') + ' · ' + ext.toUpperCase();
      }, mime, fmt === 'png' ? undefined : P.q / 100);
    }

    // ---------------------------------------------------------------- wiring
    var tb = $('ieTools');
    TOOLS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.t = t[0]; b.textContent = t[1]; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { setTool(t[0]); });
      tb.appendChild(b);
    });
    $('ieSel').addEventListener('click', function () { $('ieFile').click(); });
    $('ieCam').addEventListener('click', function () { $('ieCamFile').click(); });
    $('ieChange').addEventListener('click', function () { $('ieFile').click(); });
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
    $('ieSave').addEventListener('click', save);
    Array.prototype.forEach.call($('ieFmt').children, function (b) {
      b.addEventListener('click', function () {
        P.fmt = b.dataset.f;
        Array.prototype.forEach.call($('ieFmt').children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('ieQrow').hidden = P.fmt === 'png';
      });
    });
    $('ieQ').addEventListener('input', function (e) { P.q = +e.target.value; $('ieQv').textContent = P.q + '%'; });

    document.addEventListener('keydown', function (e) {
      if (!S.base || root.offsetParent === null) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel >= 0) { e.preventDefault(); delSel(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redoOp(); }
    });
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (S.base && root.offsetParent !== null) { layout(); render(); } }, 120); });

    // Small read-only hook used by automated tests
    root._ie = { state: function () { return { w: S.base && S.base.width, h: S.base && S.base.height, annots: S.annots.length, tool: S.tool, adj: S.adj, wm: S.wm.on, hist: hist.length, crop: crop && { x: crop.x, y: crop.y, w: crop.w, h: crop.h } }; } };
  }

  window.LovePDFiEditor = { mount: mount };
  var r = document.getElementById('imgEditorRoot');
  if (r) mount(r);
})();
