/* Administrace – editor textu, potvrzení mazání, pořadí fotek, počítadla znaků */
(function(){
  document.querySelectorAll('form[data-potvrdit]').forEach(f=>f.addEventListener('submit',e=>{ if(!confirm(f.dataset.potvrdit)) e.preventDefault(); }));
  const editor=document.querySelector('.editor'), pole=document.querySelector('textarea[name="telo"]');
  if(editor&&pole){
    document.execCommand('defaultParagraphSeparator',false,'p');
    document.querySelectorAll('.editor-lista button').forEach(b=>b.addEventListener('click',()=>{
      editor.focus();
      if(b.dataset.cmd==='createLink'){ const u=prompt('Adresa odkazu (např. https://… nebo diagnostika.html):'); if(u) document.execCommand('createLink',false,u.trim()); return; }
      document.execCommand(b.dataset.cmd,false,b.dataset.val?'<'+b.dataset.val+'>':null);
    }));
    editor.addEventListener('paste',e=>{ // vložení z Wordu: jen čistý text po odstavcích
      e.preventDefault();
      const t=(e.clipboardData||window.clipboardData).getData('text/plain');
      const html=t.split(/\r?\n\s*\r?\n|\r?\n/).filter(x=>x.trim()).map(x=>'<p>'+x.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</p>').join('');
      document.execCommand('insertHTML',false,html);
    });
    editor.closest('form').addEventListener('submit',()=>{ pole.value=editor.innerHTML; });
  }
  document.querySelectorAll('[data-pocitadlo]').forEach(s=>{
    const max=+s.dataset.pocitadlo, i=s.parentElement.querySelector('input,textarea');
    const up=()=>{ s.textContent=`${i.value.length} / ${max} znaků`; s.style.color=i.value.length>max?'#b3261e':''; };
    i.addEventListener('input',up); up();
  });
  const sez=document.querySelector('.fotky');
  if(sez){
    sez.addEventListener('click',e=>{
      const li=e.target.closest('li'); if(!li) return;
      if(e.target.closest('.odebrat')){ if(confirm('Odebrat tuto fotku z reference? (Smaže se po uložení.)')) li.remove(); return; }
      const p=e.target.closest('[data-posun]'); if(!p) return;
      if(p.dataset.posun==='-1'&&li.previousElementSibling) li.parentNode.insertBefore(li,li.previousElementSibling);
      if(p.dataset.posun==='1'&&li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling,li);
    });
    let tazena=null;
    sez.addEventListener('dragstart',e=>{ tazena=e.target.closest('li'); });
    sez.addEventListener('dragover',e=>{ e.preventDefault(); const nad=e.target.closest('li'); if(nad&&tazena&&nad!==tazena){ const r=nad.getBoundingClientRect(); nad.parentNode.insertBefore(tazena,(e.clientX-r.left)>r.width/2?nad.nextSibling:nad); } });
  }
})();
