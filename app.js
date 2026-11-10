const realms={"imperium": {"name": "Neo-Orthodox Imperium", "kicker": "ORDER / FAITH / HUMAN DIGNITY", "image": "imperium.webp", "index": "01 / 03", "description": "A vast Eurasian civilization, founded on Nevin Zemlya’s promise to restore human dignity after the upheaval of automation. Faith, duty and human labor hold its world together. Its monumental capital, St. Zemlya, embodies that certainty. The Imperium rejects civilian artificial intelligence and robotics, while trains, industry and military technology remain part of everyday life.", "place": "St. Zemlya", "promise": "Dignity through faith and human work", "tension": "The price of certainty"}, "britain": {"name": "Great Britain", "kicker": "HERITAGE / TECHNOLOGY / NATURE", "image": "britain.webp", "index": "02 / 03", "description": "An advanced Celtic civilization where modern life carries the memory of an older world. Iona and the Sacred Isles sit within a realm of extraordinary engineering, living landscapes and inherited traditions. Its ancient-looking forms do not make it a land of the past: advanced technology is woven into the world around its people. Project Morrigan’s dragon, Mark VII, hints at what that combination can create.", "place": "Iona and the Sacred Isles", "promise": "A future rooted in heritage and nature", "tension": "Ancient forms, extraordinary technology"}, "collective": {"name": "Symbiotic Collective", "kicker": "HUMAN / MACHINE / UNEQUAL FUTURES", "image": "collective.webp", "index": "03 / 03", "description": "In the cities of the Symbiotic Collective, humans and machines share the same streets. Tokyo’s corporate towers rise above densely packed housing; nature is scarce, and comfort is unevenly distributed. This is a realm shaped by technological possibility, but the lives of those above and below can look very different. Its name carries a promise of coexistence. Its streets reveal the harder questions of who benefits.", "place": "Tokyo", "promise": "Human and machine, living together", "tension": "Abundance above, crowded lives below"}};
document.querySelectorAll('[data-home]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.scroll).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})));
document.querySelectorAll('[data-realm-widget]').forEach(widget => {
  const buttons = widget.querySelectorAll('[data-realm-pick]');
  const image = widget.querySelector('[data-realm-image]');
  const guideLink = widget.querySelector('[data-realm-guide]');
  const guideNames = { imperium: 'the Imperium', britain: 'Great Britain', collective: 'the Collective' };

  function showRealm(key) {
    const realm = realms[key];
    if (widget.dataset.realm === key) return;

    widget.dataset.realm = key;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.realmPick === key)));
    image.src = realm.image;
    image.alt = realm.name;
    guideLink.href = `/world/#${key}`;
    guideLink.firstChild.textContent = `Explore ${guideNames[key]} `;
    for (const field of ['name', 'description', 'index', 'kicker', 'place', 'promise', 'tension']) {
      widget.querySelectorAll(`[data-realm-${field}]`).forEach(element => {
        element.textContent = realm[field];
      });
    }
  }

  function readRealm() {
    const key = new URLSearchParams(location.search).get('realm');
    showRealm(Object.hasOwn(realms, key) ? key : 'imperium');
  }

  image.addEventListener('load', () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    image.getAnimations().forEach(animation => animation.cancel());
    image.animate(
      [{ opacity: .7, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 480, easing: 'ease-out' }
    );
  });

  buttons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.realmPick;
    if (widget.dataset.realm === key) return;
    showRealm(key);
    const url = new URL(location.href);
    url.searchParams.set('realm', key);
    url.hash = 'a-world';
    history.pushState(null, '', url);
  }));

  window.addEventListener('popstate', readRealm);
  readRealm();
});
const dialog=document.getElementById('episode-dialog');let opener=null;
const player=dialog.querySelector('[data-video-player]');
function stopEpisode(){player.replaceChildren();opener?.focus();}
document.querySelectorAll('[data-episode]').forEach(button => button.addEventListener('click', () => {
  opener = button;
  const commentary = button.dataset.episode === 'commentary';
  const videoId = commentary ? 'oeduFd3913c' : '040Yenmm-zA';
  const title = commentary ? 'Every Utopia Ends in Fire — Creator Commentary' : 'Every Utopia Ends in Fire';
  dialog.querySelector('[data-video-label]').textContent = commentary ? 'S01E01 · CREATOR COMMENTARY · 3:53' : 'S01E01 · 3:42';
  dialog.querySelector('#episode-title').textContent = title;
  dialog.querySelector('[data-video-description]').textContent = commentary
    ? 'Dan Hegelund watches the first episode and talks through the story, the three realms, and the choices that shaped the film.'
    : 'Many forms. One Sophia.';
  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  frame.title = `${title} — Sophia’s Embrace S01E01`;
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  player.replaceChildren(frame);
  dialog.showModal();
  dialog.querySelector('.dialog-close').focus();
}));
function closeDialog(){dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',closeDialog);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});dialog.addEventListener('close',stopEpisode);
