/* LovePDFi result helper.
 * v2: downloads start directly on the same page. No new tab, no redirect.
 * (The old version intercepted every download link and opened /download-result in a new tab,
 *  which caused endless tabs when that page failed.) */
(function () {
  'use strict';
  // Optional helper other scripts may call: start a download for a Blob right away.
  window.finalResultRedirect = async function (blobOrResult, options) {
    options = options || {};
    var blob = blobOrResult instanceof Blob ? blobOrResult : null;
    if (!blob && blobOrResult && blobOrResult.fileData) {
      var bin = atob(blobOrResult.fileData), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blob = new Blob([arr], { type: blobOrResult.fileType || 'application/octet-stream' });
      options.fileName = options.fileName || blobOrResult.fileName;
    }
    if (!blob) throw new Error('Final result data is missing.');
    var name = options.fileName || 'lovepdfi-result' + (blob.type === 'application/pdf' ? '.pdf' : blob.type === 'image/png' ? '.png' : blob.type.indexOf('image/') === 0 ? '.jpg' : '');
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.dataset.skipUniversalResult = '1'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  };
})();
