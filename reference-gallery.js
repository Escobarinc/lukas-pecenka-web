(() => {
  const titleToSlug = {
    'Sanace a odvlhčení historické stavby | 2019–2026': 'sanace-odvlhceni-historickeho-objektu',
    'Sanace kaple svaté Markéty v obci Cejle': 'sanace-kaple',
    'Sanace sklepa činžovního domu v Plzni': 'sanace-sklepa-cinzovniho-domu-v-plzni',
    'Vlhkostní problémy se nevyhýbají ani novostavbám': 'vlhkostni-problemy-se-nevyhybaji-ani-novostavbam',
    'Horizontální infuzní clona Nové Město na Moravě': 'horizontalni-infuzni-clona-nove-mesto-na-morave',
    'Sanovat lze každou nemovitost': 'sanovat-jde-kazda-nemovitost',
    'Jak to dopadá, když se u práce nepřemýšlí': 'jak-to-dopada-kdyz-se-u-prace-nepremysli',
    'Fasáda zámku': 'uz-jsme-se-na-to-nemohli-divat',
    'Žabokliky — 2. etapa': 'zabokliky-2-etapa',
    'Fara v obci Žabokliky': 'fara-v-obci-zabokliky-nedaleko-zatce',
    'Nečekané zjištění': 'necekane-zjisteni',
    'Druhá etapa sanace tvrze v Hrobčicích': 'druha-etapa-sanace-tvrze-v-hrobcicich',
    'Sanace tvrze z druhé poloviny 16. století': 'sanace-tvrze-z-druhe-poloviny-16-stoleti',
    'Sanace vily': 'sanace-vily',
    'Sanace rodinného domu ve Štětí': 'sanace-rodinneho-domu-ve-steti',
    'Hydroizolace domu v Hradci Králové': 'hydroizolace-domu-v-hradci-kralove',
    'Sanace domu s nepřístupnou vnější stěnou': 'sanace-domu-s-nepristupnou-vnejsi-stenou',
    'Předělání špatně provedené sanace u rodinného domu': 'predelani-spatne-provedene-sanace-u-rodinneho-domu',
    'Sanace sklepa se stojící vodou': 'sanace-sklepu-se-stojici-vodou',
    'Sanace sklepa pod silnou zátěží tlakové vody': 'sanace-sklepa-pod-silnou-zatezi-tlakove-vody',
    'Sanace v zabydlené místnosti': 'sanace-v-zabydlene-mistnosti',
    'Záchrana hydroizolace v hotové hrubé stavbě': 'zachrana-hydroizolace-v-hotove-hrube-stavbe',
    'Sanace barokního Sankturinovského domu v Kutné Hoře': 'sanace-barokniho-sankturinovskeho-domu-v-kutne-hore',
    'Sanace kapličky v obci Bílý Kámen': 'sanace-kaplicky-v-obci-bily-kamen',
    'Sanace kaple Nanebevzetí Panny Marie': 'sanace-kaple-nanebevzeti-panny-marie',
    'Sanace budovy raně renesančního slohu v Jemnici': 'jemnice',
    'Zámek Puklice z 19. století': 'sanace-zamku-puklice',
    'Evangelický kostel ve Frýdku-Místku': 'evangelicky-kostel-ve-frydku-mistku',
    'Národní muzeum v Praze': 'narodni-muzeum-v-praze',
    'Kostel ve Vřesině': 'kostel-ve-vresine',
    'Fürleova kaple v Mikulášovicích': 'furleova-kaple-v-mikulasovicich',
    'Kaplička v Ostrožské Nové Vsi': 'kaplicka-v-ostrozske-nove-vsi',
    'Zámeček Dřevíč': 'reference-zamecek-drevic',
    'Kostel v obci Rybí': 'kostel-v-obci-rybi',
    'Zámek Stránov': 'zamek-stranov',
    'Hradby v parku pod Vlašským dvorem': 'hradby-v-parku-pod-vlasskym-dvorem',
    'Kostel sv. Jana Nepomuckého ve Štramberku': 'kostela-sv-jana-nepomuckeho-ve-stramberku',
    'Tučňáci a jejich domečky': 'tucnaci-a-jejich-domecky',
    'Kašna Vsetín': 'kasna-vsetin',
    'Čistička odpadních vod Přerov': 'cistirna-odpadnich-vod-prerov',
    'Vodní svět ZOO Dvůr Králové': 'zoo-dvur-kralove',
    'Škola v České Skalici': 'skola-v-ceske-skalici'
  };

  const openPanels = new Set();
  let manifest = {};
  let lightboxImages = [];
  let lightboxIndex = 0;

  const lightbox = document.createElement('dialog');
  lightbox.className = 'reference-lightbox';
  lightbox.setAttribute('aria-label', 'Prohlížeč fotografií reference');
  lightbox.innerHTML = `<div class="reference-lightbox-inner"><button class="reference-lightbox-close" type="button" aria-label="Zavřít">×</button><button class="reference-lightbox-arrow is-prev" type="button" aria-label="Předchozí fotografie">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="reference-lightbox-arrow is-next" type="button" aria-label="Další fotografie">›</button></div>`;
  document.body.append(lightbox);

  function showLightbox(index) {
    if (!lightboxImages.length) return;
    lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
    const current = lightboxImages[lightboxIndex];
    const image = lightbox.querySelector('img');
    image.src = current.src;
    image.alt = current.alt;
    lightbox.querySelector('figcaption').textContent = `${current.title} · ${lightboxIndex + 1} / ${lightboxImages.length}`;
    if (!lightbox.open) lightbox.showModal();
  }

  lightbox.querySelector('.reference-lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.is-prev').addEventListener('click', () => showLightbox(lightboxIndex - 1));
  lightbox.querySelector('.is-next').addEventListener('click', () => showLightbox(lightboxIndex + 1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
    if (event.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
  });

  function closeOtherPanels(except) {
    openPanels.forEach((panel) => {
      if (panel === except) return;
      panel.hidden = true;
      panel.previousElementSibling?.classList.remove('is-open');
      const button = panel.previousElementSibling?.querySelector('.reference-open');
      if (button) button.setAttribute('aria-expanded', 'false');
      openPanels.delete(panel);
    });
  }

  function buildAlbum(panel, project) {
    if (panel.dataset.ready === 'true') return;
    panel.dataset.ready = 'true';
    const images = project.images || [];
    panel.innerHTML = `<div class="reference-album-head"><div><span>FOTOGALERIE REALIZACE</span><h3>${project.title}</h3></div><button class="reference-album-close" type="button" aria-label="Zavřít galerii">Zavřít ×</button></div><div class="reference-album-grid"></div>`;
    const grid = panel.querySelector('.reference-album-grid');
    images.forEach((src, index) => {
      const button = document.createElement('button');
      const image = document.createElement('img');
      button.type = 'button';
      button.className = 'reference-photo';
      button.setAttribute('aria-label', `Otevřít fotografii ${index + 1} z ${images.length}`);
      image.src = src;
      image.alt = `${project.title} — fotografie ${index + 1}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      button.append(image);
      button.addEventListener('click', () => {
        lightboxImages = images.map((imageSrc, imageIndex) => ({ src: imageSrc, alt: `${project.title} — fotografie ${imageIndex + 1}`, title: project.title }));
        showLightbox(index);
      });
      grid.append(button);
    });
    panel.querySelector('.reference-album-close').addEventListener('click', () => {
      panel.hidden = true;
      panel.previousElementSibling?.classList.remove('is-open');
      panel.previousElementSibling?.querySelector('.reference-open')?.setAttribute('aria-expanded', 'false');
      openPanels.delete(panel);
    });
  }

  function prepareCard(card, project, options = {}) {
    if (card.dataset.galleryReady === 'true') return;
    card.dataset.galleryReady = 'true';
    card.dataset.referenceSlug = options.slug || '';
    const title = card.querySelector('h3')?.textContent.trim() || project.title || 'Referenční realizace';
    const images = project.images || [];
    const cover = images[0] || options.fallbackCover;
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    figure.className = 'reference-card-media';
    image.alt = title;
    image.decoding = 'async';
    image.loading = options.eager ? 'eager' : 'lazy';
    if (cover) image.src = cover;
    figure.append(image);
    card.prepend(figure);

    if (!images.length) return;
    const button = document.createElement('button');
    button.className = 'reference-open';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = `<span>Fotografie</span><strong>${images.length}</strong><i aria-hidden="true">⌄</i>`;
    card.append(button);

    const panel = document.createElement('section');
    panel.className = 'reference-album';
    panel.hidden = true;
    panel.setAttribute('aria-label', `Fotogalerie: ${title}`);
    card.after(panel);

    button.addEventListener('click', () => {
      const opening = panel.hidden;
      closeOtherPanels(panel);
      if (opening) {
        buildAlbum(panel, { ...project, title });
        panel.hidden = false;
        card.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
        openPanels.add(panel);
        requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      } else {
        panel.hidden = true;
        card.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        openPanels.delete(panel);
      }
    });
  }

  function fallbackCover(index) {
    const imageNumber = Math.min(index + 1, 42);
    const extension = new Set([18, 20, 21, 22, 25, 26, 27]).has(imageNumber) ? 'jpeg' : 'jpg';
    return `assets/references/reference-${String(imageNumber).padStart(2, '0')}.${extension}`;
  }

  function prepareStaticCards() {
    [...document.querySelectorAll('.reference-card')].forEach((card, index) => {
      const title = card.querySelector('h3')?.textContent.trim() || '';
      const slug = titleToSlug[title];
      const fallback = fallbackCover(index);
      const project = slug && manifest[slug] ? manifest[slug] : { title, images: [fallback] };
      prepareCard(card, project, { slug, fallbackCover: fallback, eager: index < 4 });
    });
  }

  function addCustomProject(project) {
    const section = document.getElementById(project.category) || document.getElementById('aktualni');
    const grid = section?.querySelector('.reference-grid');
    if (!grid) return null;
    const card = document.createElement('article');
    card.className = 'reference-card reference-card-custom';
    card.dataset.customReferenceId = project.id;
    const heading = document.createElement('h3');
    heading.textContent = project.title;
    card.append(heading);
    if (project.description) {
      const description = document.createElement('p');
      description.className = 'reference-card-description';
      description.textContent = project.description;
      card.append(description);
    }
    grid.prepend(card);
    prepareCard(card, project, { slug: project.id, eager: false });
    return card;
  }

  window.ReferenceGallery = { addCustomProject };

  if (window.REFERENCE_ALBUMS) { manifest = window.REFERENCE_ALBUMS; prepareStaticCards(); return; }
  fetch('reference-albums.json?v=40')
    .then((response) => {
      if (!response.ok) throw new Error('Manifest galerie se nepodařilo načíst.');
      return response.json();
    })
    .then((data) => { manifest = data; prepareStaticCards(); })
    .catch(() => { prepareStaticCards(); });
})();
