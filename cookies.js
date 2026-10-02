/* Cookie lišta – souhlas podle zákona (opt-in).
   - bez souhlasu se nespouští žádné analytické ani marketingové značky
   - „Odmítnout vše“ je stejně dostupné jako „Přijmout vše“
   - volbu lze kdykoli změnit odkazem „Nastavení cookies“ v patičce
   - Google Consent Mode v2: výchozí stav denied, po volbě update
   Až se přidá Google Analytics / Tag Manager, načte se přes window.lpConsent (viz spustitZnacky). */
(function(){
  const KEY='lp-cookie-consent';
  const VERZE=1;
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=window.gtag||gtag;
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});

  function nacti(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&v.verze===VERZE?v:null;}catch(e){return null;}}
  function uloz(analyticke,marketingove){
    const v={verze:VERZE,analyticke:!!analyticke,marketingove:!!marketingove,datum:new Date().toISOString()};
    try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}
    pouzij(v);
  }
  function pouzij(v){
    gtag('consent','update',{
      analytics_storage:v.analyticke?'granted':'denied',
      ad_storage:v.marketingove?'granted':'denied',
      ad_user_data:v.marketingove?'granted':'denied',
      ad_personalization:v.marketingove?'granted':'denied'
    });
    window.lpConsent=v;
    document.dispatchEvent(new CustomEvent('lp-consent',{detail:v}));
  }

  const lista=document.createElement('div');
  lista.className='cookie-bar';
  lista.setAttribute('role','dialog');
  lista.setAttribute('aria-label','Nastavení cookies');
  lista.hidden=true;
  lista.innerHTML=`<div class="cookie-inner">
    <div class="cookie-text">
      <strong>Soubory cookies</strong>
      <p>Nezbytné cookies potřebuje web ke svému fungování. Analytické a marketingové cookies použijeme jen s Vaším souhlasem – pomáhají nám zjistit, jak web používáte, a zlepšovat ho. <a href="cookies.html">Více informací</a></p>
      <div class="cookie-settings" hidden>
        <label><input type="checkbox" checked disabled> <span><b>Nezbytné</b> – fungování webu, uložení Vaší volby</span></label>
        <label><input type="checkbox" data-cookie="analyticke"> <span><b>Analytické</b> – měření návštěvnosti (Google Analytics)</span></label>
        <label><input type="checkbox" data-cookie="marketingove"> <span><b>Marketingové</b> – měření reklamních kampaní (Google Ads)</span></label>
      </div>
    </div>
    <div class="cookie-actions">
      <button type="button" class="btn btn-outline" data-akce="odmitnout">Odmítnout vše</button>
      <button type="button" class="btn btn-outline" data-akce="nastaveni">Nastavení</button>
      <button type="button" class="btn btn-outline" data-akce="ulozit" hidden>Uložit volbu</button>
      <button type="button" class="btn btn-primary" data-akce="prijmout">Přijmout vše</button>
    </div>
  </div>`;
  document.body.append(lista);
  const nastaveni=lista.querySelector('.cookie-settings');
  const btnUlozit=lista.querySelector('[data-akce="ulozit"]');
  const btnNastaveni=lista.querySelector('[data-akce="nastaveni"]');
  const zavri=()=>{lista.hidden=true;};
  function otevri(detail){
    const v=nacti();
    lista.querySelector('[data-cookie="analyticke"]').checked=!!(v&&v.analyticke);
    lista.querySelector('[data-cookie="marketingove"]').checked=!!(v&&v.marketingove);
    nastaveni.hidden=!detail;btnUlozit.hidden=!detail;btnNastaveni.hidden=!!detail;
    lista.hidden=false;
  }
  lista.addEventListener('click',e=>{
    const a=e.target.closest('[data-akce]')?.dataset.akce;
    if(a==='prijmout'){uloz(true,true);zavri();}
    if(a==='odmitnout'){uloz(false,false);zavri();}
    if(a==='nastaveni'){otevri(true);}
    if(a==='ulozit'){uloz(lista.querySelector('[data-cookie="analyticke"]').checked,lista.querySelector('[data-cookie="marketingove"]').checked);zavri();}
  });

  // odkaz v patičce
  const pata=document.querySelector('.footer-bottom .container');
  if(pata){
    const odkaz=document.createElement('button');
    odkaz.type='button';odkaz.className='cookie-footer-link';odkaz.textContent='Nastavení cookies';
    odkaz.addEventListener('click',()=>otevri(true));
    pata.append(odkaz);
  }
  document.querySelectorAll('[data-cookie-open]').forEach(b=>b.addEventListener('click',()=>otevri(true)));

  const ulozeno=nacti();
  if(ulozeno)pouzij(ulozeno);else otevri(false);
})();
