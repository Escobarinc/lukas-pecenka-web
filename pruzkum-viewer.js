(function(){
  const docs={
    mereni:{title:'Díl 1 – Měření vlhkosti a salinity',pages:28},
    technologie:{title:'Díl 2 – Technologie a postup prací',pages:21}
  };
  const openers=document.querySelectorAll('.pruzkum-open');
  if(!openers.length)return;
  const pad=n=>String(n).padStart(2,'0');
  const dialog=document.createElement('dialog');
  dialog.className='document-dialog pruzkum-dialog';
  dialog.setAttribute('aria-label','Prohlížeč průzkumu');
  dialog.innerHTML=`<div class="document-dialog-inner">
    <div class="document-dialog-head">
      <div><span class="eyebrow">UKÁZKA PRŮZKUMU · ZÁMEK PUKLICE</span><h2></h2></div>
      <div class="pruzkum-head-actions"><a class="btn btn-outline pruzkum-download" download>Stáhnout PDF</a><button class="document-close" type="button" aria-label="Zavřít prohlížeč">×</button></div>
    </div>
    <div class="document-stage" aria-live="polite"><button type="button" class="pruzkum-zoom" title="Zvětšit stranu" aria-label="Zvětšit stranu"><img alt=""></button></div>
    <div class="document-toolbar">
      <button class="document-prev" type="button" aria-label="Předchozí strana">←</button>
      <div class="document-page-meta"><strong></strong><span></span></div>
      <button class="document-next" type="button" aria-label="Další strana">→</button>
    </div>
    <div class="document-thumbs pruzkum-thumbs" aria-label="Výběr strany"></div>
  </div>`;
  document.body.append(dialog);
  const heading=dialog.querySelector('h2'),img=dialog.querySelector('.document-stage img'),zoom=dialog.querySelector('.pruzkum-zoom'),stage=dialog.querySelector('.document-stage');
  function setZoom(on){stage.classList.toggle('is-zoomed',on);zoom.title=on?'Zmenšit stranu':'Zvětšit stranu';zoom.setAttribute('aria-label',zoom.title);if(on)stage.scrollTop=0;}
  zoom.addEventListener('click',()=>setZoom(!stage.classList.contains('is-zoomed')));
  const title=dialog.querySelector('.document-page-meta strong'),counter=dialog.querySelector('.document-page-meta span');
  const thumbs=dialog.querySelector('.pruzkum-thumbs'),download=dialog.querySelector('.pruzkum-download');
  let current=null,page=0,previousFocus=null;
  function src(doc,i,small){return `assets/pruzkum/${doc}/${small?'nahled/':''}s-${pad(i+1)}.jpg`;}
  function show(i){
    const d=docs[current];
    page=(i+d.pages)%d.pages;
    stage.scrollTop=0;img.src=src(current,page);img.alt=`${d.title} – strana ${page+1}`;
    title.textContent=d.title;counter.textContent=`Strana ${page+1} z ${d.pages}`;
    [...thumbs.children].forEach((b,j)=>b.classList.toggle('is-active',j===page));
    thumbs.children[page]?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
    if(page+1<d.pages)new Image().src=src(current,page+1);
  }
  function open(doc,start){
    if(current!==doc){
      current=doc;const d=docs[doc];
      heading.textContent=d.title;download.href=`assets/pruzkum/puklice-${doc}.pdf`;
      thumbs.innerHTML='';
      for(let i=0;i<d.pages;i++){
        const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Strana ${i+1}`);
        b.innerHTML=`<img src="${src(doc,i,true)}" alt="" loading="lazy">`;
        b.addEventListener('click',()=>show(i));thumbs.append(b);
      }
    }
    previousFocus=document.activeElement;setZoom(false);show(start||0);dialog.showModal();dialog.querySelector('.document-close').focus();
  }
  function close(){dialog.close();previousFocus?.focus();}
  openers.forEach(b=>b.addEventListener('click',()=>open(b.dataset.doc,Number(b.dataset.page)||0)));
  dialog.querySelector('.document-close').addEventListener('click',close);
  dialog.querySelector('.document-prev').addEventListener('click',()=>show(page-1));
  dialog.querySelector('.document-next').addEventListener('click',()=>show(page+1));
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft')show(page-1);
    if(e.key==='ArrowRight')show(page+1);
    if(e.key==='Escape'){e.preventDefault();if(stage.classList.contains('is-zoomed'))setZoom(false);else close();}
  });
})();
