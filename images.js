/* LovePDFi /assets/tools/images.js — loads heavy libs for this tool group once */
export async function init(){
  if(!window.LovePDFiLibs) throw new Error("loader.js not loaded");
  await window.LovePDFiLibs.loadFor("images");
}
