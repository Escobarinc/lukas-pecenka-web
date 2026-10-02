(() => {
  if (!window.ReferenceGallery || !('indexedDB' in window)) return;

  const databaseName = 'lp-reference-cms';
  const storeName = 'projects';
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return databasePromise;
  }

  async function storeRequest(mode, action) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const getProjects = () => storeRequest('readonly', (store) => store.getAll());
  const saveProject = (project) => storeRequest('readwrite', (store) => store.put(project));
  const removeProject = (id) => storeRequest('readwrite', (store) => store.delete(id));

  function projectForGallery(project) {
    return {
      ...project,
      images: project.photos.map((photo) => URL.createObjectURL(photo))
    };
  }

  function addManagementControls(card, project) {
    if (!card || card.querySelector('.reference-admin-card-actions')) return;
    const controls = document.createElement('div');
    controls.className = 'reference-admin-card-actions';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Smazat referenci';
    removeButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!window.confirm(`Opravdu smazat referenci „${project.title}“?`)) return;
      await removeProject(project.id);
      const panel = card.nextElementSibling?.classList.contains('reference-album') ? card.nextElementSibling : null;
      panel?.remove();
      card.remove();
    });
    controls.append(removeButton);
    card.append(controls);
  }

  async function compressPhoto(file) {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Fotografii se nepodařilo zpracovat.')), 'image/webp', .84));
  }

  const editorActions = document.querySelector('.editor-actions');
  if (!editorActions) return;

  const addButton = document.createElement('button');
  addButton.className = 'editor-secondary reference-admin-add';
  addButton.type = 'button';
  addButton.textContent = '+ Nová reference';
  editorActions.prepend(addButton);

  const dialog = document.createElement('dialog');
  dialog.className = 'reference-admin-dialog';
  dialog.innerHTML = `
    <form class="reference-admin-form">
      <div class="reference-admin-head"><div><span>SPRÁVA REFERENCÍ</span><h2>Přidat novou zakázku</h2></div><button class="reference-admin-close" type="button" aria-label="Zavřít">×</button></div>
      <label><span>Název reference *</span><input name="title" required maxlength="120" placeholder="Např. Sanace rodinného domu v Brně"></label>
      <div class="reference-admin-row"><label><span>Kategorie *</span><select name="category" required><option value="aktualni">Aktuální realizace</option><option value="domy">Domy a sklepy</option><option value="pamatky">Památky</option><option value="verejne">Veřejné a technické stavby</option></select></label><label><span>Fotografie *</span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label></div>
      <label><span>Krátký popis</span><textarea name="description" rows="4" maxlength="500" placeholder="Co se na stavbě řešilo a jaký byl výsledek"></textarea></label>
      <div class="reference-admin-file-info" aria-live="polite">Vyberte jednu nebo více fotografií.</div>
      <div class="reference-admin-footer"><small>Fotografie se automaticky zmenší pro rychlé načítání.</small><button class="btn btn-primary" type="submit">Uložit referenci <span>→</span></button></div>
      <div class="reference-admin-status" role="status" aria-live="polite"></div>
    </form>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const photosInput = form.elements.photos;
  const status = dialog.querySelector('.reference-admin-status');
  const submitButton = form.querySelector('[type="submit"]');

  addButton.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.reference-admin-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  photosInput.addEventListener('change', () => {
    const count = photosInput.files.length;
    dialog.querySelector('.reference-admin-file-info').textContent = count ? `Vybráno fotografií: ${count}` : 'Vyberte jednu nebo více fotografií.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const files = [...photosInput.files];
    if (!files.length) return;
    submitButton.disabled = true;
    status.textContent = 'Zpracovávám fotografie…';
    try {
      const photos = [];
      for (let index = 0; index < files.length; index += 1) {
        status.textContent = `Zpracovávám fotografii ${index + 1} z ${files.length}…`;
        photos.push(await compressPhoto(files[index]));
      }
      const project = {
        id: `custom-${Date.now()}`,
        title: form.elements.title.value.trim(),
        category: form.elements.category.value,
        description: form.elements.description.value.trim(),
        photos,
        createdAt: new Date().toISOString()
      };
      await saveProject(project);
      const card = window.ReferenceGallery.addCustomProject(projectForGallery(project));
      addManagementControls(card, project);
      form.reset();
      dialog.querySelector('.reference-admin-file-info').textContent = 'Vyberte jednu nebo více fotografií.';
      status.textContent = 'Reference byla uložena.';
      setTimeout(() => { dialog.close(); status.textContent = ''; card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 700);
    } catch (error) {
      status.textContent = 'Referenci se nepodařilo uložit. Zkuste menší počet fotografií.';
    } finally {
      submitButton.disabled = false;
    }
  });

  getProjects()
    .then((projects) => projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((project) => {
      const card = window.ReferenceGallery.addCustomProject(projectForGallery(project));
      addManagementControls(card, project);
    }))
    .catch(() => {});
})();
