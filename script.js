(function(){
  const root=document.documentElement;
  const themeButtons=[...document.querySelectorAll('.theme-toggle')];
  const savedTheme=localStorage.getItem('lp-theme');
  function setTheme(theme,persist){
    root.dataset.theme=theme;
    themeButtons.forEach(button=>{
      const dark=theme==='dark';
      button.setAttribute('aria-pressed',String(dark));
      button.setAttribute('aria-label',dark?'Přepnout na světlý režim':'Přepnout na tmavý režim');
    });
    if(persist)localStorage.setItem('lp-theme',theme);
  }
  setTheme(savedTheme||'light',false);
  themeButtons.forEach(button=>button.addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark',true)));

  const editorPage=location.pathname.split('/').pop()||'index.html';
  const editorStorageKey=`lp-content:${editorPage}`;
  const editorSelector=[
    '.brand-copy strong','.brand-copy small','.header-motto','main .eyebrow','main h1','main h2','main h3','main p',
    '.trust-big','.trust-item strong','.trust-item small','.trust-note','.signature','.signature-caption',
    '.process-feature-grid span','.feature-grid span','.check-list li','.direct-contact .contact-value','.form-title h3','.form-title p',
    '.upload-note strong','.upload-note small','.contact-benefits h3','.footer-motto'
  ].join(',');
  const editableElements=[...document.querySelectorAll(editorSelector)].filter((el,index,list)=>!list.some(other=>other!==el&&other.contains(el)));
  const originalContent={};
  const storedContent=JSON.parse(localStorage.getItem(editorStorageKey)||'{}');
  const legacyEmail='omitkyaodstranovanivlhkosti@gmail.com';
  const currentEmail='info@lukaspecenka.cz';
  let migratedStoredContent=false;
  Object.keys(storedContent).forEach(key=>{
    if(typeof storedContent[key]==='string'&&storedContent[key].includes(legacyEmail)){
      storedContent[key]=storedContent[key].split(legacyEmail).join(currentEmail);
      migratedStoredContent=true;
    }
  });
  if(migratedStoredContent)localStorage.setItem(editorStorageKey,JSON.stringify(storedContent));

  function safeEditableHtml(value){
    const holder=document.createElement('div');
    holder.innerHTML=String(value);
    holder.querySelectorAll('script,style,iframe,object,embed,img,svg,a,button,input,textarea,form').forEach(el=>el.remove());
    holder.querySelectorAll('*').forEach(el=>{
      if(el.tagName==='BR')return;
      el.replaceWith(...el.childNodes);
    });
    return holder.innerHTML;
  }

  editableElements.forEach((el,index)=>{
    const id=`text-${index+1}`;
    el.dataset.editId=id;
    originalContent[id]=el.innerHTML;
    if(Object.prototype.hasOwnProperty.call(storedContent,id))el.innerHTML=safeEditableHtml(storedContent[id]);
  });

  /* starý editační režim v prohlížeči odstraněn 3. 10. 2026 – správa obsahu je v /admin/ (PHP) */

  const documentOpeners=[...document.querySelectorAll('.document-open')];
  if(documentOpeners.length||document.querySelector('.document-carousel')){
    const documentPages=[
      {label:'Titulní strana',viewBox:'35 30 310 400'},
      {label:'Obsah průzkumu',viewBox:'370 30 310 400'},
      {label:'Fotodokumentace',viewBox:'700 30 325 400'},
      {label:'Závěry a doporučení',viewBox:'1050 30 295 400'},
      {label:'Popis objektu',viewBox:'370 30 310 400'},
      {label:'Stavebně technický stav',viewBox:'1050 30 295 400'},
      {label:'Měření vlhkosti',viewBox:'700 30 325 400'},
      {label:'Vyhodnocení příčin poruch',viewBox:'1050 30 295 400'},
      {label:'Návrh sanačních opatření',viewBox:'700 30 325 400'},
      {label:'Doporučený postup',viewBox:'1050 30 295 400'}
    ];
    const dialog=document.createElement('dialog');
    dialog.className='document-dialog';
    dialog.setAttribute('aria-label','Prohlížeč sanačního průzkumu');
    dialog.innerHTML=`
      <div class="document-dialog-inner">
        <div class="document-dialog-head">
          <div><span class="eyebrow">UKÁZKA DOKUMENTU</span><h2>Sanační průzkum</h2></div>
          <button class="document-close" type="button" aria-label="Zavřít prohlížeč">×</button>
        </div>
        <div class="document-stage" aria-live="polite"></div>
        <div class="document-toolbar">
          <button class="document-prev" type="button" aria-label="Předchozí strana">←</button>
          <div class="document-page-meta"><strong></strong><span></span></div>
          <button class="document-next" type="button" aria-label="Další strana">→</button>
        </div>
        <div class="document-thumbs" aria-label="Výběr strany"></div>
      </div>`;
    document.body.append(dialog);
    const stage=dialog.querySelector('.document-stage');
    const title=dialog.querySelector('.document-page-meta strong');
    const counter=dialog.querySelector('.document-page-meta span');
    const thumbs=dialog.querySelector('.document-thumbs');
    let documentPage=0;
    let previousFocus=null;
    const pageSvg=page=>`<svg viewBox="${page.viewBox}" role="img" aria-label="${page.label}" preserveAspectRatio="xMidYMid meet"><image href="assets/process-pdf-reference.jpg" width="1350" height="495"/></svg>`;
    documentPages.forEach((page,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.setAttribute('aria-label',`Zobrazit: ${page.label}`);
      button.innerHTML=pageSvg(page);
      button.addEventListener('click',()=>showDocumentPage(index));
      thumbs.append(button);
    });
    function showDocumentPage(index){
      documentPage=(index+documentPages.length)%documentPages.length;
      const page=documentPages[documentPage];
      stage.innerHTML=pageSvg(page);
      title.textContent=page.label;
      counter.textContent=`Strana ${documentPage+1} z ${documentPages.length}`;
      [...thumbs.children].forEach((button,i)=>button.classList.toggle('is-active',i===documentPage));
    }
    function openDocument(startPage=0){
      previousFocus=document.activeElement;
      showDocumentPage(startPage);
      dialog.showModal();
      dialog.querySelector('.document-close').focus();
    }
    function closeDocument(){
      dialog.close();
      previousFocus?.focus();
    }
    documentOpeners.forEach(button=>button.addEventListener('click',()=>openDocument(Number(button.dataset.page)||0)));
    dialog.querySelector('.document-close').addEventListener('click',closeDocument);
    dialog.querySelector('.document-prev').addEventListener('click',()=>showDocumentPage(documentPage-1));
    dialog.querySelector('.document-next').addEventListener('click',()=>showDocumentPage(documentPage+1));
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeDocument();});
    dialog.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft')showDocumentPage(documentPage-1);
      if(event.key==='ArrowRight')showDocumentPage(documentPage+1);
      if(event.key==='Escape'){event.preventDefault();closeDocument();}
    });
    showDocumentPage(0);

    const carousel=document.querySelector('.document-carousel');
    if(carousel){
      const viewport=carousel.querySelector('.document-carousel-viewport');
      const track=carousel.querySelector('.document-carousel-track');
      const previous=carousel.querySelector('.document-carousel-prev');
      const next=carousel.querySelector('.document-carousel-next');
      const carouselCounter=carousel.querySelector('.document-carousel-counter');
      let carouselPage=0;
      function visibleCards(){return window.innerWidth<=700?2:window.innerWidth<=1180?3:5;}
      function updateCarousel(animate=true){
        const max=Math.max(0,documentPages.length-visibleCards());
        carouselPage=Math.min(max,Math.max(0,carouselPage));
        const targetCard=track.children[carouselPage];
        viewport.scrollTo({left:targetCard?(targetCard.offsetLeft-track.offsetLeft):0,behavior:animate?'smooth':'auto'});
        previous.disabled=carouselPage===0;
        next.disabled=carouselPage===max;
        const first=carouselPage+1;
        const last=Math.min(documentPages.length,carouselPage+visibleCards());
        carouselCounter.textContent=`Strany ${first}–${last} z ${documentPages.length}`;
      }
      previous.addEventListener('click',()=>{carouselPage--;updateCarousel();});
      next.addEventListener('click',()=>{carouselPage++;updateCarousel();});
      window.addEventListener('resize',()=>updateCarousel(false),{passive:true});
      updateCarousel(false);
    }
  }

  const shell=document.getElementById('site-shell');
  function fitDesktop(){
    if(!shell) return;
    if(window.innerWidth>1180){
      shell.style.zoom=String(Math.min(window.innerWidth/1440,1.12));
    }else{
      shell.style.zoom='1';
    }
  }
  fitDesktop();
  window.addEventListener('resize',fitDesktop,{passive:true});
  const toggle=document.querySelector('.mobile-toggle');
  const menu=document.getElementById('mobile-menu');
  if(toggle&&menu){
    toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.hidden=open;});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');menu.hidden=true;}));
  }
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href'); const target=document.querySelector(id); if(!target)return;
    e.preventDefault(); target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }));
  const form=document.querySelector('.contact-form');
  if(form){
    const status=form.querySelector('.form-status');
    const btn=form.querySelector('[type="submit"]');
    const t=form.querySelector('[name="t"]'); if(t) t.value=String(Date.now());
    const soubory=form.querySelector('input[type="file"]');
    const info=form.querySelector('.upload-info');
    const puvodniInfo=info?info.textContent:'';
    if(soubory&&info) soubory.addEventListener('change',()=>{
      const f=[...soubory.files]; const mb=f.reduce((a,x)=>a+x.size,0)/1048576;
      info.textContent=f.length?`Vybráno: ${f.length} ${f.length===1?'soubor':f.length<5?'soubory':'souborů'} (${mb.toFixed(1)} MB)`:puvodniInfo;
      info.classList.toggle('upload-chyba',f.length>8||mb>20);
    });
    const mailto=data=>{
      const subject=`Poptávka diagnostiky – ${data.get('name')}`;
      const body=[`Jméno: ${data.get('name')}`,`Telefon: ${data.get('phone')}`,`E-mail: ${data.get('email')}`,`Lokalita: ${data.get('location')||'neuvedena'}`,
        ...(data.has('year')?[`Rok výstavby: ${data.get('year')||'neuveden'}`,`Typ zdiva: ${data.get('construction')||'neuveden'}`,`Kde se problém projevuje: ${data.get('where')||'neuvedeno'}`]:[]),
        '','Popis problému:',data.get('message')||'neuveden','','Fotografie případně přiložím k této zprávě.'].join('\n');
      status.textContent='Otevírám připravenou zprávu ve vaší e-mailové aplikaci…';
      window.location.href=`mailto:${form.dataset.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      let valid=true;
      form.querySelectorAll('[required]').forEach(el=>{const bad=el.type==='checkbox'?!el.checked:!el.value.trim()||(el.type==='email'&&!/^\S+@\S+\.\S+$/.test(el.value))||(el.name==='phone'&&!/^[+0-9 ()\/-]{9,20}$/.test(el.value.trim()));el.setAttribute('aria-invalid',String(bad));if(bad)valid=false;});
      if(!valid){status.textContent='Doplňte prosím jméno, telefon a platný e-mail.';status.className='form-status chyba';form.querySelector('[aria-invalid="true"]')?.focus();return;}
      if(soubory&&soubory.files.length>8){status.textContent='Přiložte prosím nejvýše 8 souborů.';status.className='form-status chyba';return;}
      const data=new FormData(form);
      btn.disabled=true; status.className='form-status'; status.textContent='Odesílám poptávku…';
      try{
        const r=await fetch(form.getAttribute('action'),{method:'POST',body:data,headers:{'Accept':'application/json'}});
        const j=await r.json().catch(()=>null);
        if(!j) throw new Error('server bez PHP');
        if(j.ok){
          window.lpUdalost&&window.lpUdalost('formular_odeslan',{fotek:soubory?soubory.files.length:0});
          form.reset(); if(t) t.value=String(Date.now()); if(info) info.textContent=puvodniInfo;
          status.className='form-status ok'; status.textContent='Děkuji, poptávka odešla. Ozvu se vám co nejdříve.';
        }else{
          (j.pole||[]).forEach(n=>form.querySelector(`[name="${n}"]`)?.setAttribute('aria-invalid','true'));
          status.className='form-status chyba'; status.textContent=j.chyba||'Zprávu se nepodařilo odeslat. Zavolejte prosím na +420 602 529 179.';
        }
      }catch(err){ mailto(data); }
      finally{ btn.disabled=false; }
    });
  }
})();
