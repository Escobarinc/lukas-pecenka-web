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

  const adminSessionKey='lp-admin-session-v1';
  const adminSessionValue='pecenka-admin-authenticated';
  if(sessionStorage.getItem(adminSessionKey)===adminSessionValue){
    document.body.classList.add('admin-authenticated');
    const editorUi=document.createElement('div');
    editorUi.className='page-editor-ui';
    editorUi.innerHTML=`
      <div class="admin-toolbar" role="region" aria-label="Správa webu">
        <div class="admin-toolbar-state"><span aria-hidden="true"></span><strong>Správa webu</strong><small>${document.title.split('—')[0].trim()}</small></div>
        <div class="admin-toolbar-actions">
          <button class="editor-launch" type="button" aria-expanded="false"><span aria-hidden="true">✎</span> Upravit stránku</button>
          <button class="admin-logout" type="button">Odhlásit</button>
        </div>
      </div>
      <aside class="editor-panel" aria-label="Editor stránky" hidden>
        <div class="editor-panel-copy"><strong>Úpravy přímo na stránce</strong><span>Klikněte do označeného textu a přepište jej.</span></div>
        <div class="editor-actions">
          <button class="editor-secondary editor-cancel" type="button">Zrušit</button>
          <button class="editor-secondary editor-reset" type="button">Obnovit texty</button>
          <button class="editor-save" type="button">Uložit změny</button>
        </div>
      </aside>
      <div class="editor-toast" role="status" aria-live="polite"></div>`;
    document.body.append(editorUi);

    const editorLaunch=editorUi.querySelector('.editor-launch');
    const editorPanel=editorUi.querySelector('.editor-panel');
    const editorToast=editorUi.querySelector('.editor-toast');
    let editMode=false;
    let snapshot={};
    let toastTimer;

    function announceEditor(message){
      editorToast.textContent=message;
      editorToast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer=setTimeout(()=>editorToast.classList.remove('is-visible'),2600);
    }
    function setEditing(active){
      editMode=active;
      document.body.classList.toggle('is-editing',active);
      editorPanel.hidden=!active;
      editorLaunch.disabled=active;
      editorLaunch.setAttribute('aria-expanded',String(active));
      editableElements.forEach(el=>{
        el.contentEditable=active?'true':'false';
        el.spellcheck=active;
        if(active)el.setAttribute('role','textbox');else el.removeAttribute('role');
      });
    }
    function currentContent(){
      return Object.fromEntries(editableElements.map(el=>[el.dataset.editId,safeEditableHtml(el.innerHTML)]));
    }
    editorLaunch.addEventListener('click',()=>{
      snapshot=currentContent();
      setEditing(true);
      announceEditor('Editor je zapnutý. Klikněte na libovolný zvýrazněný text.');
    });
    editorUi.querySelector('.editor-cancel').addEventListener('click',()=>{
      editableElements.forEach(el=>{el.innerHTML=snapshot[el.dataset.editId]??el.innerHTML;});
      setEditing(false);
      announceEditor('Neuložené změny byly zrušeny.');
    });
    editorUi.querySelector('.editor-save').addEventListener('click',()=>{
      const content=currentContent();
      editableElements.forEach(el=>{el.innerHTML=content[el.dataset.editId];});
      localStorage.setItem(editorStorageKey,JSON.stringify(content));
      setEditing(false);
      announceEditor('Změny byly uloženy v tomto prohlížeči.');
    });
    editorUi.querySelector('.editor-reset').addEventListener('click',()=>{
      editableElements.forEach(el=>{el.innerHTML=originalContent[el.dataset.editId];});
      localStorage.removeItem(editorStorageKey);
      snapshot={...originalContent};
      announceEditor('Původní texty byly obnoveny.');
    });
    editorUi.querySelector('.admin-logout').addEventListener('click',()=>{
      sessionStorage.removeItem(adminSessionKey);
      location.href='admin.html';
    });
    editableElements.forEach(el=>{
      el.addEventListener('keydown',event=>{
        if(!editMode)return;
        if(event.key==='Escape')editorUi.querySelector('.editor-cancel').click();
        if(event.key==='Enter'&&(el.matches('.eyebrow,.trust-big,.trust-item strong,.trust-item small,.signature,.signature-caption,.process-feature-grid span,.feature-grid span,.check-list li,.direct-contact a,.form-title h3,.footer-motto'))){event.preventDefault();el.blur();}
      });
      el.addEventListener('click',event=>{if(editMode){event.preventDefault();event.stopPropagation();}});
    });
  }

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
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const required=[...form.querySelectorAll('[required]')];
      let valid=true;
      required.forEach(el=>{const bad=el.type==='checkbox'?!el.checked:!el.value.trim()||(el.type==='email'&&!/^\S+@\S+\.\S+$/.test(el.value));el.setAttribute('aria-invalid',String(bad));if(bad)valid=false;});
      if(!valid){status.textContent='Doplňte prosím povinné údaje a souhlas.';return;}
      const data=new FormData(form);
      const recipient=form.dataset.recipient;
      const subject=`Poptávka diagnostiky – ${data.get('name')}`;
      const body=[
        `Jméno: ${data.get('name')}`,
        `Telefon: ${data.get('phone')}`,
        `E-mail: ${data.get('email')}`,
        `Lokalita: ${data.get('location')||'neuvedena'}`,
        ...(data.has('year')?[`Rok výstavby: ${data.get('year')||'neuveden'}`,`Typ zdiva: ${data.get('construction')||'neuveden'}`,`Kde se problém projevuje: ${data.get('where')||'neuvedeno'}`]:[]),
        '',
        'Popis problému:',
        data.get('message')||'neuveden',
        '',
        'Fotografie případně přiložím k této zprávě.'
      ].join('\n');
      status.textContent='Otevírám připravenou zprávu ve vaší e-mailové aplikaci…';
      window.location.href=`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
