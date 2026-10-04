/* Hodnocení z Google Business Profile.
   Vyplňuje CLARIX ručně, a to JEN skutečnými údaji z profilu na Googlu (nic nevymýšlet).
   - odkazRecenze: odkaz „Napsat recenzi“ / „Požádat o recenze“ z Google Business Profile (g.page/r/…/review)
   - odkazProfil:  odkaz na profil v Mapách Google
   - hodnoceni, pocet: průměr a počet hodnocení přesně podle Googlu (aktualizovat cca 1× měsíčně)
   - recenze: max. 3 skutečné recenze, doslova zkopírované, se jménem tak, jak je na Googlu
   Dokud je odkazRecenze prázdný, sekce na webu není vidět. */
const GOOGLE_HODNOCENI = {
  odkazRecenze: '',
  odkazProfil: '',
  hodnoceni: null,   // např. 4.9
  pocet: null,       // např. 23
  recenze: [
    // { jmeno: 'Jan N.', hvezdy: 5, text: '…' },
  ],
};

(function () {
  const g = GOOGLE_HODNOCENI;
  const sekce = document.getElementById('hodnoceni');
  if (!sekce || !g.odkazRecenze) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hvezdy = n => '<span class="hvezdy" aria-hidden="true">' + '★'.repeat(Math.round(n)) + '<i>' + '★'.repeat(5 - Math.round(n)) + '</i></span>';
  const souhrn = sekce.querySelector('.hod-souhrn');
  if (g.hodnoceni && g.pocet) {
    const cislo = g.hodnoceni.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    souhrn.innerHTML = '<b>' + cislo + '</b>' + hvezdy(g.hodnoceni) +
      '<span>' + g.pocet + ' hodnocení na Googlu</span>';
    souhrn.setAttribute('aria-label', 'Hodnocení ' + cislo + ' z 5 podle ' + g.pocet + ' hodnocení na Googlu');
  } else souhrn.remove();
  const seznam = sekce.querySelector('.hod-recenze');
  if (g.recenze.length) {
    seznam.innerHTML = g.recenze.slice(0, 3).map(r =>
      '<figure class="hod-karta">' + hvezdy(r.hvezdy || 5) + '<blockquote>„' + esc(r.text) + '“</blockquote><figcaption>' + esc(r.jmeno) + ' · Google</figcaption></figure>'
    ).join('');
  } else seznam.remove();
  sekce.querySelector('.hod-napsat').href = g.odkazRecenze;
  const profil = sekce.querySelector('.hod-profil');
  if (g.odkazProfil) profil.href = g.odkazProfil; else profil.remove();
  sekce.hidden = false;
})();
