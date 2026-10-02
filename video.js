/* Video z YouTube: nejdřív jen náhled, přehrávač (a cookies YouTube) až po kliknutí.
   Při otevření webu ze souboru (file://) YouTube vložené video neumí – video se otevře na YouTube. */
(function(){
  document.querySelectorAll('.video-card[data-video]').forEach(card=>{
    const id=card.dataset.video;
    const btn=card.querySelector('.video-play');
    btn.addEventListener('click',()=>{
      if(location.protocol==='file:'){window.open('https://www.youtube.com/watch?v='+id,'_blank','noopener');return;}
      const f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
      f.title=card.querySelector('h3')?.textContent||'Video';
      f.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen=true;
      btn.replaceWith(f);
    });
  });
})();
