(function(){
  const body=document.body;
  const current=body.dataset.current||'';
  const nav=[
    ['pruzkum','sanacni-pruzkum.html','Sanační průzkum'],
    ['diagnostika','diagnostika.html','Diagnostika'],
    ['technologie','sanacni-technologie.html','Sanační technologie'],
    ['ukazka','ukazka-pruzkumu.html','Ukázka průzkumu'],
    ['reference','reference.html','Reference'],
    ['omne','o-mne.html','O mně'],
    ['otazky','otazky-a-odpovedi.html','Otázky a odpovědi'],
    ['kontakt','kontakt.html','Kontakt']
  ];
  const links=nav.map(([key,href,label])=>`<a href="${href}"${current===key?' aria-current="page"':''}>${label}</a>`).join('');
  const header=document.createElement('header');
  header.className='site-header';
  header.innerHTML=`<div class="container header-inner">
    <a class="brand" href="index.html" aria-label="Lukáš Pečenka — úvod">
      <span class="brand-logo-frame" aria-hidden="true"><img class="brand-logo brand-logo-light" src="assets/logo-light-source.png" alt=""><img class="brand-logo brand-logo-dark" src="assets/logo-dark-source.png" alt=""></span>
      <span class="brand-copy"><strong>Lukáš Pečenka</strong><small>DIAGNOSTIKA STAVEB</small></span>
    </a>
    <nav class="desktop-nav" aria-label="Hlavní navigace">${links}</nav>
    <button class="theme-toggle" type="button" aria-label="Přepnout na tmavý režim" aria-pressed="false">
      <svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
    </button>
    <a class="btn btn-primary header-cta" href="kontakt.html#poptavka">Objednat průzkum <span>→</span></a>
    <button class="mobile-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Otevřít menu"><span></span><span></span><span></span></button>
  </div><div id="mobile-menu" class="mobile-menu" hidden>${links}</div>`;
  const shell=document.getElementById('site-shell');
  shell.prepend(header);

  const footer=document.createElement('footer');
  footer.className='site-footer';
  footer.innerHTML=`<div class="container footer-main">
    <a class="footer-brand" href="index.html"><span class="footer-logo-frame" aria-hidden="true"><img src="assets/logo-dark-source.png" alt=""></span><span class="footer-brand-copy"><strong>Lukáš Pečenka</strong><small>DIAGNOSTIKA A SANACE VLHKOSTI STAVEB</small></span></a>
    <a class="footer-contact-link" href="tel:+420602529179"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-3 2c1.2 2.5 3 4.3 5.5 5.5l2-3 5 2v4c0 1.1-.9 2-2 2C10.5 21.5 2.5 13.5 2.5 5.5c0-1.1.9-1.5 2.5-1.5z"/></svg><span>+420 602 529 179</span></a>
    <a class="footer-contact-link" href="mailto:info@lukaspecenka.cz"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><span>info@lukaspecenka.cz</span></a>
    <div class="footer-contact-link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Působím po celé ČR</span></div>
    <div class="footer-social" aria-label="Sociální sítě">
      <a href="https://www.facebook.com/profile.php?id=61554669236131" target="_blank" rel="noopener" aria-label="Facebook Lukáše Pečenky" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.7.3-1 1-1Z"/></svg></a>
      <a href="https://www.youtube.com/@sanacelukaspecenka6075" target="_blank" rel="noopener" aria-label="YouTube Sanace Lukáš Pečenka" title="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path class="social-play" d="m10 9 6 3-6 3Z"/></svg></a>
    </div>
  </div><div class="footer-bottom"><div class="container"><span>© 2026 Lukáš Pečenka. Všechna práva vyhrazena.</span><span>Profesionální diagnostika. Trvalé hodnoty.</span></div></div>`;
  shell.append(footer);
})();
