/* Mapa průzkumů a vybrané reference. Data: reference-mapa.js (obce a počty) a reference-vybrane.js. */
(() => {
  const D = window.REFERENCE_MAPA, V = window.REFERENCE_VYBRANE || [];
  if (!D) return;
  // Kalibrace mapy assets/czechia-outline.svg (rovnoběžková projekce, krajní body ČR)
  const LON0 = 12.091, LON1 = 18.859, LAT0 = 48.552, LAT1 = 51.055;
  const X0 = 0.01272, X1 = 0.98949, Y0 = 0.02176, Y1 = 0.97847;
  const pos = (lat, lon) => [X0 + (lon - LON0) / (LON1 - LON0) * (X1 - X0), Y0 + (LAT1 - lat) / (LAT1 - LAT0) * (Y1 - Y0)];
  const cz = (n, a, b, c) => n === 1 ? a : n >= 2 && n <= 4 ? b : c;
  const prA = n => `${n} ${cz(n, 'průzkum', 'průzkumy', 'průzkumů')}`;
  const roky = Object.keys(D.po_letech);
  const rozsah = `${roky[0]}–${roky[roky.length - 1]}`;

  document.querySelectorAll('[data-ref="celkem"]').forEach(e => e.textContent = D.celkem);
  document.querySelectorAll('[data-ref="obci"]').forEach(e => e.textContent = D.obci);
  document.querySelectorAll('[data-ref="rozsah"]').forEach(e => e.textContent = rozsah);
  document.querySelectorAll('[data-ref="dalsich"]').forEach(e => e.textContent = D.celkem - Number(e.dataset.minus || 0));
  document.querySelectorAll('[data-ref="roky"]').forEach(e => {
    e.innerHTML = roky.map(r => `<div><b>${D.po_letech[r]}</b><span>${r}</span></div>`).join('');
  });

  document.querySelectorAll('.ref-map').forEach(box => {
    box.innerHTML = '<img class="ref-map-cz" src="assets/czechia-outline.svg?v=48" alt="Mapa České republiky s místy průzkumů"><div class="ref-tip" hidden></div>';
    const tip = box.querySelector('.ref-tip');
    const show = (b, el) => {
      const detail = Object.entries(b.roky).map(([r, n]) => `${r}: ${n}`).join(' · ');
      tip.innerHTML = `<strong>${b.obec}</strong><span>${prA(b.pocet)}</span><small>${detail}</small>`;
      tip.hidden = false;
      const r = el.getBoundingClientRect(), R = box.getBoundingClientRect();
      tip.style.left = (r.left - R.left + r.width / 2) + 'px';
      tip.style.top = (r.top - R.top) + 'px';
      tip.classList.toggle('dole', r.top - R.top < 90);
    };
    [...D.body].sort((a, b) => b.pocet - a.pocet).forEach(b => {
      const [x, y] = pos(b.lat, b.lon);
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'ref-dot';
      d.setAttribute('aria-label', `${b.obec}: ${prA(b.pocet)}`);
      const k = Math.max(.5, Math.min(1, box.clientWidth / 800));
      const s = Math.round((9 + Math.sqrt(b.pocet) * 3) * k);
      d.style.cssText = `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:${s}px;height:${s}px`;
      d.addEventListener('mouseenter', () => show(b, d));
      d.addEventListener('focus', () => show(b, d));
      d.addEventListener('click', () => show(b, d));
      d.addEventListener('mouseleave', () => tip.hidden = true);
      d.addEventListener('blur', () => tip.hidden = true);
      box.appendChild(d);
    });
  });

  const IKONY = {
    'Památka': '<path d="M12 3 4 8h16zM6 8v10M10 8v10M14 8v10M18 8v10M3 20h18"/>',
    'Veřejná budova': '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18"/>',
    'Technická stavba': '<path d="M3 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 12c3 0 3-2 6-2s3 2 6 2 3-2 6-2M6 4v5M18 4v5"/>'
  };
  document.querySelectorAll('.ref-featured').forEach(box => {
    const limit = Number(box.dataset.limit || V.length);
    const vyber = box.dataset.pick ? box.dataset.pick.split(',').map(i => V[Number(i)]) : V.slice(0, limit);
    box.insertAdjacentHTML('afterbegin', vyber.map(r => `
      <article class="ref-card"><div class="ref-card-top"><svg viewBox="0 0 24 24">${IKONY[r.typ] || IKONY['Památka']}</svg><span>${r.typ} · ${r.rok}</span></div>
      <h3>${r.nazev}</h3><p class="ref-misto">${r.misto}</p><p>${r.popis}</p></article>`).join(''));
  });
})();
