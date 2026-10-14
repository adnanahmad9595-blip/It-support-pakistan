/* LovePDFi chrome helpers — safe on all pages */
(function(){
  var burger=document.getElementById('burger');
  var nav=document.getElementById('nav');
  if(burger&&nav){
    burger.addEventListener('click',function(){
      var open=nav.classList.toggle('show');
      burger.setAttribute('aria-expanded', open?'true':'false');
    });
  }
})();
