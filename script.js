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
  /* Úpravy textů a přidávání obsahu přímo na webu – viz blok „Správa webu přímo na stránce“ na konci souboru. */

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

  /* Plovoucí tlačítko Zavolat (jen na mobilu; schová se u kontaktního formuláře a v patičce) */
  const volat=document.createElement('a');
  volat.className='plovouci-volat'; volat.href='tel:+420602529179';
  volat.setAttribute('aria-label','Zavolat Lukáši Pečenkovi: +420 602 529 179');
  volat.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-3 2c1.2 2.5 3 4.3 5.5 5.5l2-3 5 2v4c0 1.1-.9 2-2 2C10.5 21.5 2.5 13.5 2.5 5.5c0-1.1.9-1.5 2.5-1.5z"/></svg><span>Zavolat</span>';
  document.body.appendChild(volat);
  const cile=[...document.querySelectorAll('.contact-form,.site-footer,#poptavka')];
  if('IntersectionObserver' in window && cile.length){
    const vidim=new Set();
    const io=new IntersectionObserver(z=>{z.forEach(x=>x.isIntersecting?vidim.add(x.target):vidim.delete(x.target));volat.classList.toggle('skryt',vidim.size>0);},{threshold:.05});
    cile.forEach(c=>io.observe(c));
  }

  /* Popis problému: bez ručního roztahování, výška roste automaticky s textem */
  document.querySelectorAll('.contact-form textarea').forEach(t=>{
    const min=t.offsetHeight||0;
    const prizpusob=()=>{t.style.height='auto';t.style.height=Math.max(min,t.scrollHeight+2)+'px';};
    t.addEventListener('input',prizpusob);
  });

  /* ===== Správa webu přímo na stránce =====
     Vstup: ikona špendlíku v patičce → heslo (okno s /admin/) → lišta dole.
     Texty se upravují kliknutím, „Uložit“ je zapíše na server (admin/api.php, záloha předchozí verze).
     Reference a články se přidávají / upravují formulářem adminu v okně. */
  (()=>{
    const KLIC='lp-sprava';
    const tlacPopis={'reference.html':[['reference-upravit','+ Přidat referenci'],['reference','Upravit reference']],'pomoc-a-rady.html':[['clanek','+ Přidat článek'],['clanky','Upravit články']]};
    const jeClanek=/^rada-.+\.html$/.test(editorPage);
    const generovana=jeClanek||editorPage==='pomoc-a-rady.html'||editorPage==='404.html';
    const vyber='main h1,main h2,main h3,main h4,main p,main li,main .eyebrow,main .page-kicker,main figcaption,main .trust-item strong,main .trust-item small';
    const vynech='form,nav,button,a,.reference-card,.reference-album,.ref-featured,.ref-map,.document-carousel,.document-dialog,.czech-map,.hod-recenze,.hod-souhrn,.cookie-bar,.spravce-lista,script,svg';
    // původní texty zachytit hned (než je jiné skripty přepíšou)
    const kandidati=[...document.querySelectorAll(vyber)].filter(el=>!el.closest(vynech)&&el.textContent.trim()&&!el.querySelector('img,svg,iframe,input,a,button,[data-ref]'))
      .filter((el,i,l)=>!l.some(o=>o!==el&&o.contains(el)));
    const puvodni=new Map(kandidati.map(el=>[el,el.innerHTML]));
    let csrf='',okno=null,lista=null,upravy=false;const upravene=new Set();

    const otevriOkno=(url,titulek)=>{
      zavriOkno();
      okno=document.createElement('div');okno.className='spravce-okno';
      okno.innerHTML='<div class="spravce-panel" role="dialog" aria-modal="true" aria-label="'+titulek+'"><div class="spravce-hlava"><strong>'+titulek+'</strong><button type="button" class="spravce-zavrit" aria-label="Zavřít">×</button></div><iframe src="'+url+'" title="'+titulek+'"></iframe></div>';
      document.body.appendChild(okno);document.documentElement.classList.add('spravce-otevreno');
      okno.querySelector('.spravce-zavrit').addEventListener('click',zavriOkno);
      okno.addEventListener('click',e=>{if(e.target===okno)zavriOkno();});
    };
    function zavriOkno(){okno?.remove();okno=null;document.documentElement.classList.remove('spravce-otevreno');}
    const zmenene=()=>[...upravene].filter(el=>el.innerHTML!==puvodni.get(el));
    const stav=t=>{const s=lista?.querySelector('.spravce-stav');if(s)s.textContent=t;};
    const obnovTlacitka=()=>{if(!lista)return;const n=zmenene().length;lista.querySelector('[data-a="ulozit"]').disabled=!n;lista.querySelector('[data-a="zahodit"]').disabled=!n;if(n)stav(n+' '+(n===1?'změna':n<5?'změny':'změn')+' – neuloženo');};
    const prepniUpravy=zap=>{
      upravy=zap;document.documentElement.classList.toggle('spravce-upravy',zap);
      kandidati.forEach(el=>{if(zap){el.contentEditable='true';el.spellcheck=true;}else el.removeAttribute('contenteditable');});
      const t=lista?.querySelector('[data-a="texty"]');if(t){t.textContent=zap?'Hotovo s úpravami':'Upravit texty';t.classList.toggle('zap',zap);}
      if(zap)stav('Klikněte do textu a pište. Nakonec „Uložit“.');
    };
    const ukazListu=()=>{
      if(lista)return;
      lista=document.createElement('div');lista.className='spravce-lista';lista.setAttribute('role','toolbar');lista.setAttribute('aria-label','Správa webu');
      let h='<strong>Správa webu</strong><span class="spravce-stav"></span>';
      if(!generovana&&kandidati.length)h+='<button type="button" data-a="texty">Upravit texty</button>';
      (tlacPopis[editorPage]||[]).forEach(([a,t])=>{h+='<button type="button" data-okno="admin/?a='+a+'&v=1">'+t+'</button>';});
      if(jeClanek)h+='<button type="button" data-okno="admin/?a=clanek&slug='+encodeURIComponent(editorPage.replace(/^rada-|\.html$/g,''))+'&v=1">Upravit tento článek</button>';
      if(!generovana&&kandidati.length)h+='<button type="button" data-a="zahodit" disabled>Zahodit</button><button type="button" class="hlavni" data-a="ulozit" disabled>Uložit</button>';
      h+='<a href="admin/" target="_blank" rel="noopener">Celá správa ↗</a><button type="button" data-a="odhlasit">Odhlásit</button>';
      lista.innerHTML=h;document.body.appendChild(lista);document.documentElement.classList.add('spravce-aktivni');
      if(generovana)stav(jeClanek?'Text článku upravíte tlačítkem „Upravit tento článek“.':'Články přidáte a upravíte tlačítky vpravo.');
      lista.addEventListener('click',async e=>{
        const b=e.target.closest('button');if(!b)return;
        if(b.dataset.okno)return otevriOkno(b.dataset.okno,b.textContent.replace(/^\+ /,''));
        const a=b.dataset.a;
        if(a==='texty')prepniUpravy(!upravy);
        if(a==='zahodit'&&confirm('Zahodit neuložené změny textů?')){upravene.forEach(el=>{el.innerHTML=puvodni.get(el);});upravene.clear();obnovTlacitka();stav('Změny zahozeny.');}
        if(a==='ulozit')ulozit();
        if(a==='odhlasit'){if(zmenene().length&&!confirm('Máte neuložené změny. Opravdu odhlásit?'))return;try{sessionStorage.removeItem(KLIC);}catch(_){}location.href='admin/?a=odhlasit';}
      });
      if(!generovana&&kandidati.length)stav('Přihlášeno. Texty upravíte tlačítkem „Upravit texty“.');
    };
    async function ulozit(){
      const zm=zmenene();if(!zm.length)return;
      const btn=lista.querySelector('[data-a="ulozit"]');btn.disabled=true;stav('Ukládám…');
      try{
        const r=await fetch('admin/api.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF':csrf},
          body:JSON.stringify({akce:'texty',stranka:editorPage,zmeny:zm.map(el=>({tag:el.tagName.toLowerCase(),puvodni:puvodni.get(el),nova:el.innerHTML}))})});
        const d=await r.json().catch(()=>({chyba:'Server neodpověděl správně.'}));
        if(!r.ok||!d.ok){stav(d.chyba||'Uložení se nepovedlo.');btn.disabled=false;if(d.nenalezeno?.length)alert('Tyto texty se nepodařilo uložit (zkontrolujte je v celé správě):\n\n– '+d.nenalezeno.join('\n– '));return;}
        zm.forEach(el=>puvodni.set(el,el.innerHTML));
        stav('Uloženo ('+d.ulozeno+') ✓'+(d.nenalezeno?.length?' – '+d.nenalezeno.length+' se nepodařilo':''));
        if(d.nenalezeno?.length)alert('Uloženo, ale tyto texty se nepodařilo spárovat a zůstaly původní:\n\n– '+d.nenalezeno.join('\n– '));
        obnovTlacitka();
      }catch(_){stav('Uložení se nepovedlo – zkontrolujte připojení.');btn.disabled=false;}
    }
    document.addEventListener('input',e=>{const el=e.target.closest&&e.target.closest('[contenteditable="true"]');if(upravy&&el&&kandidati.includes(el)){upravene.add(el);obnovTlacitka();}});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&okno)zavriOkno();
      if(upravy&&e.key==='Enter'&&e.target.isContentEditable&&!e.shiftKey){e.preventDefault();} // Enter nevytváří nové odstavce
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'&&lista&&zmenene().length){e.preventDefault();ulozit();}
    });
    document.addEventListener('paste',e=>{if(upravy&&e.target.isContentEditable){e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain'));}});
    window.addEventListener('beforeunload',e=>{if(zmenene().length){e.preventDefault();e.returnValue='';}});
    window.addEventListener('message',e=>{
      if(e.origin!==location.origin||!e.data)return;
      if(e.data.lp==='prihlasen'){zavriOkno();try{sessionStorage.setItem(KLIC,'1');}catch(_){}overStav();}
      if(e.data.lp==='ulozeno'){setTimeout(()=>location.reload(),900);}
    });
    async function overStav(){
      try{const r=await fetch('admin/api.php?stav',{credentials:'same-origin',cache:'no-store'});const d=await r.json();
        if(d.prihlasen){csrf=d.csrf;ukazListu();return true;}
      }catch(_){}
      try{sessionStorage.removeItem(KLIC);}catch(_){}
      return false;
    }
    // vstup: ikona špendlíku v patičce (patička podstránek vzniká skriptem – proto delegace)
    document.addEventListener('click',async e=>{
      const v=e.target.closest('.pata-vstup');if(!v)return;
      e.preventDefault();
      if(await overStav())return lista?.scrollIntoView?.({block:'end'});
      otevriOkno('admin/?a=prihlasen&v=1','Přihlášení do správy webu');
    });
    let jeSprava=false;try{jeSprava=sessionStorage.getItem(KLIC)==='1';}catch(_){}
    if(jeSprava)overStav();
  })();
})();
