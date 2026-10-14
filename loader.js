/* LovePDFi lazy library loader
 * Heavy third-party scripts load once, only when a tool needs them.
 */
(function (global) {
  var URLS = {
    imgc: 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js',
    qr: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
    jsqr: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    pdflib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    atable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    heic: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'
  };
  var SETS = {
    images: ['imgc'],
    pdf: ['pdflib', 'pdfjs'],
    files: ['xlsx', 'jspdf', 'atable'],
    qrtools: ['qr', 'jsqr'],
    heic: ['heic'],
    zip: ['jszip']
  };
  var _p = {}, ready = {};
  function toolLoadingMsg(on, label) {
    var el = document.getElementById('msg');
    if (!el) return;
    if (on) {
      el.dataset.loadingTool = '1';
      el.textContent = label || 'Loading tool…';
    } else if (el.dataset.loadingTool) {
      delete el.dataset.loadingTool;
      if (/^Loading (tool|image|PDF|spreadsheet|QR|HEIC|ZIP)/i.test(el.textContent || '')) el.textContent = '';
    }
  }
  function lj(k) {
    return _p[k] || (_p[k] = new Promise(function (res, rej) {
      if (document.querySelector('script[data-lp-lib="' + k + '"]')) {
        res();
        return;
      }
      var s = document.createElement('script');
      s.src = URLS[k];
      s.async = true;
      s.dataset.lpLib = k;
      s.onload = function () {
        if (k === 'pdfjs' && global.pdfjsLib) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          } catch (e) {}
        }
        res();
      };
      s.onerror = function () {
        delete _p[k];
        rej(new Error('Failed to load ' + k));
      };
      document.head.appendChild(s);
    }));
  }
  function loadFor(t) {
    if (ready[t]) return Promise.resolve();
    var labels = {
      images: 'Loading image tools…',
      pdf: 'Loading PDF tools…',
      files: 'Loading spreadsheet tools…',
      qrtools: 'Loading QR tools…',
      heic: 'Loading HEIC decoder…',
      zip: 'Loading ZIP tools…'
    };
    toolLoadingMsg(true, labels[t] || 'Loading tool…');
    return (SETS[t] || []).reduce(function (p, k) {
      return p.then(function () { return lj(k); });
    }, Promise.resolve()).then(function () {
      ready[t] = true;
      toolLoadingMsg(false);
    }).catch(function (e) {
      toolLoadingMsg(false);
      throw e;
    });
  }
  global.LovePDFiLibs = { URLS: URLS, SETS: SETS, lj: lj, loadFor: loadFor, toolLoadingMsg: toolLoadingMsg };
})(typeof window !== 'undefined' ? window : this);
