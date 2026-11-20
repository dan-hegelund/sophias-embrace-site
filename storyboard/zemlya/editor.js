(()=>{'use strict';
 const $=s=>document.getElementById(s),audio=$('audio');let key,episode,baseline,plan,selected=0,current=-1,dragIndex=-1,px=18,persistence='Original plan loaded · no edits yet',saveError='';
 const params=new URLSearchParams(location.search);
 const planUrl=new URL(params.get('plan')||document.documentElement.dataset.plan,location.href);
 const mediaUrl=source=>(window.boardMedia[source]||new URL(source,planUrl).href);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clock=s=>{s=Math.max(0,Number(s)||0);return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0')};
 function recalc(){let t=0;plan.shots.forEach(s=>{s.duration=Math.max(.25,Number(s.duration)||Number(s.end)-Number(s.start)||4);s.start=t;s.end=t+s.duration;t=s.end});plan.plannedDuration=t}
 function save(){try{const payload=JSON.stringify({schema:2,sourceHash:baseline.sourceHash,version:baseline.version,selected,plan});localStorage.setItem(key,payload);if(localStorage.getItem(key)!==payload)throw Error('Saved copy could not be read back');saveError='';persistence='Saved in this browser at '+new Date().toLocaleTimeString();$('status').dataset.saved='yes';return true}catch(e){saveError='NOT SAVED: '+(e.message||e.name||'Browser storage unavailable')+'. Export your edited plan before leaving this page.';$('status').dataset.saved='no';return false}finally{totals()}}
 function totals(){const total=plan.shots.reduce((a,s)=>a+s.duration,0),song=Number(plan.duration),diff=total-song;$('status').classList.toggle('warning',Math.abs(diff)>.06||!!saveError);$('status').textContent=(Math.abs(diff)<.06?'Every second has a planned card.':diff<0?clock(-diff)+' of the song is not covered — add time to the cards.':clock(diff)+' extends beyond the song — shorten the cards.')+' Planned '+clock(total)+' · Song '+clock(song)+' · '+(saveError||persistence);$('summary').textContent=(plan.synopsis||'')+' · '+plan.shots.length+' cards.'}
 function drawTimeline(){const width=Math.max(plan.duration,plan.shots.at(-1)?.end||0)*px;$('timeline').style.width=width+'px';$('ruler').innerHTML='';for(let t=0;t<=Math.max(plan.duration,plan.plannedDuration||0);t+=10){const n=document.createElement('span');n.className='tick';n.style.left=t*px+'px';n.textContent=clock(t);$('ruler').append(n)}$('blocks').innerHTML=plan.shots.map((s,i)=>'<button class="block'+(i===selected?' selected':'')+'" data-i="'+i+'" draggable="true" style="width:'+s.duration*px+'px" title="'+esc(s.title)+' · '+clock(s.start)+'–'+clock(s.end)+'"><span class="num">'+(i+1)+'</span><span class="shotTitle">'+esc(s.title)+'</span><span class="length">'+s.duration.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'s</span></button>').join('');$('sections').innerHTML=(plan.chapters||[]).map(c=>{const shots=plan.shots.filter(s=>s.chapter===c.id);if(!shots.length)return '';const a=shots[0].start,b=shots.at(-1).end;return '<div class="section" style="left:'+a*px+'px;width:'+(b-a)*px+'px">'+esc(c.title)+'</div>'}).join('');drawCuts();updateTime()}
 const cutStep=.25;
 const cutLabel=time=>Math.floor(time/60)+':'+(time%60).toFixed(2).padStart(5,'0');
 function drawCuts(){
  const cuts=plan.shots.slice(0,-1).map((left,i)=>{
   const right=plan.shots[i+1];
   return '<button type="button" class="cut" data-cut="'+i+'" role="slider" aria-label="Cut between cards '+(i+1)+' and '+(i+2)+'" aria-valuemin="'+(left.start+cutStep)+'" aria-valuemax="'+(right.end-cutStep)+'" aria-valuenow="'+left.end+'" aria-valuetext="'+cutLabel(left.end)+'" title="Drag to trim · '+cutLabel(left.end)+'" style="left:'+left.end*px+'px"><span aria-hidden="true">↔</span></button>';
  });
  $('cuts').innerHTML=cuts.join('');
 }
 function revealSelected(){
  const shot=plan.shots[selected],view=$('viewport');
  const start=shot.start*px,end=shot.end*px;
  if(start<view.scrollLeft+20||end>view.scrollLeft+view.clientWidth-20){
   view.scrollLeft=Math.max(0,start-view.clientWidth*.35);
  }
 }
 function cutAt(i,steps){
  const left=plan.shots[i],right=plan.shots[i+1];
  const minSteps=Math.ceil((left.start+cutStep-left.end-1e-8)/cutStep);
  const maxSteps=Math.floor((right.end-cutStep-left.end+1e-8)/cutStep);
  return left.end+Math.max(minSteps,Math.min(maxSteps,steps))*cutStep;
 }
 function commitCut(i,time){
  const left=plan.shots[i],right=plan.shots[i+1];
  if(time===left.end)return false;
  audio.pause();
  if(right.cutaway)right.cutaway.offset+=right.start-time;
  left.end=right.start=time;
  left.duration=time-left.start;
  right.duration=right.end-time;
  save();
  drawTimeline();drawCards();inspector();preview(current>=0?current:selected);
  return true;
 }
 let dragCut;
 const cuts=$('cuts');
 cuts.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-cut]');
  if(!handle||e.button!==0||dragCut)return;
  const index=+handle.dataset.cut;
  dragCut={handle,index,pointer:e.pointerId,x:e.clientX,scroll:$('viewport').scrollLeft,time:plan.shots[index].end};
  handle.setPointerCapture(e.pointerId);
  handle.classList.add('dragging');
  audio.pause();
 });
 cuts.addEventListener('pointermove',e=>{
  if(dragCut?.pointer!==e.pointerId)return;
  const delta=e.clientX-dragCut.x+$('viewport').scrollLeft-dragCut.scroll;
  dragCut.time=cutAt(dragCut.index,Math.round(delta/px/cutStep));
  const x=dragCut.time*px;
  dragCut.handle.style.left=x+'px';
  $('cutGuide').style.left=x+'px';
  $('cutGuide').textContent=cutLabel(dragCut.time);
  $('cutGuide').hidden=false;
 });
 function finishCut(e,apply){
  if(dragCut?.pointer!==e.pointerId)return;
  const {handle,index,time}=dragCut;
  dragCut=null;
  $('cutGuide').hidden=true;
  handle.classList.remove('dragging');
  handle.style.left=plan.shots[index].end*px+'px';
  if(apply)commitCut(index,time);
 }
 cuts.addEventListener('pointerup',e=>finishCut(e,true));
 cuts.addEventListener('pointercancel',e=>finishCut(e,false));
 cuts.addEventListener('lostpointercapture',e=>finishCut(e,false));
 cuts.addEventListener('keydown',e=>{
  const handle=e.target.closest('[data-cut]');
  if(!handle||!['ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();
  const index=+handle.dataset.cut;
  if(commitCut(index,cutAt(index,e.key==='ArrowLeft'?-1:1))){
   cuts.children[index].focus({preventScroll:true});
  }
 });
 function drawCards(){$('cards').innerHTML=plan.shots.map((s,i)=>'<button class="card'+(i===selected?' selected':'')+'" data-i="'+i+'" draggable="true">'+(s.image?'<img src="'+esc(mediaUrl(s.image))+'" alt="" loading="lazy">':'<div style="aspect-ratio:16/9;display:grid;place-items:center;color:#a5b2a8">New scene</div>')+'<div class="details"><small>'+String(i+1).padStart(2,'0')+' / '+clock(s.start)+'–'+clock(s.end)+'</small><strong>'+esc(s.title)+'</strong></div></button>').join('')}
 function inspector(){const s=plan.shots[selected];$('selection').textContent='Card '+(selected+1)+' of '+plan.shots.length;$('editTitle').value=s.title||'';$('duration').value=s.duration.toFixed(2);$('position').textContent=clock(s.start)+'–'+clock(s.end);$('description').value=s.action||'';$('camera').value=s.camera||'';$('notes').value=s.notes||'';$('facts').innerHTML='<strong>'+esc(s.sourceStatus||'Planning candidate')+'</strong><br>'+esc(Array.isArray(s.characters)?s.characters.join(', '):s.characters||'')+(s.assetNotes?'<br>'+esc(s.assetNotes):'');$('left').disabled=selected===0;$('right').disabled=selected===plan.shots.length-1;$('delete').disabled=plan.shots.length<2}
 const cutaway=$('cutaway');
 let cutawayFrame=0;
 function syncCutaway(i,t){
  const s=plan.shots[i],cut=s?.cutaway;
  const target=cut ? t-s.start-cut.offset : -1;
  const active=!!cut&&target>=-0.001&&t<s.end;
  if(cut&&cutaway.src!==mediaUrl(cut.video)){
   cutaway.src=mediaUrl(cut.video);
   if(cut.poster)cutaway.poster=mediaUrl(cut.poster);else cutaway.removeAttribute('poster');
  }
  cutaway.hidden=!active;
  $('image').hidden=active||!s?.image;
  if(active){
   const elapsed=Math.max(0,target);
   if(cutaway.readyState>=1&&(audio.paused||cutaway.paused||Math.abs(cutaway.currentTime-elapsed)>.17)){
    if(Math.abs(cutaway.currentTime-elapsed)>.035)cutaway.currentTime=elapsed;
   }
   if(!audio.paused&&cutaway.paused)cutaway.play().catch(()=>{});
   if(audio.paused&&!cutaway.paused)cutaway.pause();
   $('shotTitle').textContent=cut.title;
   $('lyric').textContent=cut.lyric;
  }else{
   if(!cutaway.paused)cutaway.pause();
   if(s){
    $('shotTitle').textContent=s.title;
    $('lyric').textContent=s.lyric||'';
   }
  }
  $('mediaBadge').textContent=active?(cut.badge||'ORIGINAL FOOTAGE'):'ORIGINAL STORYBOARD ART';
 }
 function tickCutaway(){
  if(audio.paused){cutawayFrame=0;return;}
  const t=audio.currentTime;
  const i=plan.shots.findIndex(s=>t>=s.start&&t<s.end);
  if(plan.shots[i]?.cutaway||!cutaway.hidden)syncCutaway(i,t);
  cutawayFrame=requestAnimationFrame(tickCutaway);
 }
 function preview(i){if(!plan.shots[i])return;const s=plan.shots[i];$('image').hidden=!s.image;$('empty').hidden=!!s.image;if(s.image&&$('image').src!==mediaUrl(s.image))$('image').src=mediaUrl(s.image);$('image').alt=s.title||'Storyboard card';$('badge').textContent='CARD '+(i+1)+' / '+plan.shots.length+' · '+clock(s.start)+'–'+clock(s.end);$('shotTitle').textContent=s.title;$('lyric').textContent=s.lyric||'';syncCutaway(i,audio.currentTime||0)}
 function select(i,seek=true){selected=Math.max(0,Math.min(plan.shots.length-1,i));// Seek just inside the card: browsers can round a fractional cut back to the previous frame.
 if(seek)audio.currentTime=plan.shots[selected].start+0.001;inspector();preview(selected);document.querySelectorAll('[data-i]').forEach(n=>n.classList.toggle('selected',+n.dataset.i===selected));current=selected;updateTime()}
 function updateTime(){const t=audio.currentTime||0;$('time').textContent=clock(t);$('scrub').value=t;$('head').style.left=t*px+'px';const i=plan.shots.findIndex(s=>t>=s.start&&t<s.end);if(i>=0&&(plan.shots[i].cutaway||!cutaway.hidden))syncCutaway(i,t);document.querySelectorAll('.block').forEach(n=>n.classList.toggle('current',+n.dataset.i===i));if(i>=0&&i!==current){current=i;preview(i);if(!audio.paused){selected=i;inspector();document.querySelectorAll('[data-i]').forEach(n=>n.classList.toggle('selected',+n.dataset.i===i))}}if(!audio.paused){const view=$('viewport'),x=t*px;if(x<view.scrollLeft||x>view.scrollLeft+view.clientWidth-40)view.scrollLeft=Math.max(0,x-80)}}
 function redraw(){drawTimeline();drawCards();inspector();preview(selected);totals()}
 function mutate(fn){audio.pause();fn();recalc();save();current=-1;redraw();select(selected)}
 function move(from,to){if(from===to||to<0||to>=plan.shots.length)return;mutate(()=>{const s=plan.shots.splice(from,1)[0];plan.shots.splice(to,0,s);selected=to})}
 for(const field of [['editTitle','title'],['description','action'],['camera','camera'],['notes','notes']]){const input=$(field[0]);input.addEventListener('input',()=>{plan.shots[selected][field[1]]=input.value;save()});input.addEventListener('change',()=>{plan.shots[selected][field[1]]=input.value;save();drawCards();drawTimeline();preview(selected)})};
 $('duration').addEventListener('change',()=>{const n=Number($('duration').value);if(!Number.isFinite(n)||n<.25){inspector();return}mutate(()=>plan.shots[selected].duration=n)});
 ['blocks','cards'].forEach(id=>{const box=$(id);box.addEventListener('click',e=>{const n=e.target.closest('[data-i]');if(n){select(+n.dataset.i);revealSelected()}});box.addEventListener('dragstart',e=>{const n=e.target.closest('[data-i]');if(n){dragIndex=+n.dataset.i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragIndex))}});box.addEventListener('dragover',e=>{if(e.target.closest('[data-i]'))e.preventDefault()});box.addEventListener('drop',e=>{e.preventDefault();const n=e.target.closest('[data-i]');if(n&&dragIndex>=0)move(dragIndex,+n.dataset.i);dragIndex=-1})});
 $('left').onclick=()=>move(selected,selected-1);$('right').onclick=()=>move(selected,selected+1);
 $('duplicate').onclick=()=>mutate(()=>{const s=structuredClone(plan.shots[selected]);s.id='draft-'+Date.now();s.title+=' · copy';plan.shots.splice(selected+1,0,s);selected++});
 function addCard(){mutate(()=>{const s=plan.shots[selected]||{};plan.shots.splice(selected+1,0,{id:'draft-'+crypto.randomUUID(),title:'New scene',duration:4,image:'',chapter:s.chapter||'',action:'',camera:'',lyric:'',notes:'',sourceStatus:'New scene requested by Dan · image to create'});selected++});revealSelected();$('description').scrollIntoView({block:'center',behavior:'smooth'});$('description').focus({preventScroll:true});}
 $('blank').onclick=addCard;$('addAfter').onclick=addCard;$('addTop').onclick=addCard;
 $('delete').onclick=()=>{if(plan.shots.length>1)mutate(()=>{plan.shots.splice(selected,1);selected=Math.min(selected,plan.shots.length-1)})};
 $('reset').onclick=()=>{if(confirm('Discard your changes in this browser and restore the original storyboard?')){audio.pause();plan=structuredClone(baseline);selected=0;save();redraw();select(0)}};
 $('export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));a.href=url;a.download=(episode||'episode')+'-storyboard-edited.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const player=$('player'),fullsize=$('fullsize');
 function fullsizeLabel(){const full=document.fullscreenElement===player||player.classList.contains('expanded');fullsize.textContent=full?'⛶ Exit full size':'⛶ Full size';fullsize.setAttribute('aria-label',full?'Exit full screen':'View storyboard full screen');fullsize.setAttribute('aria-pressed',String(full))}
 fullsize.onclick=()=>{if(document.fullscreenElement===player||player.classList.contains('expanded')){player.classList.remove('expanded');if(document.fullscreenElement===player)document.exitFullscreen().catch(()=>{});fullsizeLabel()}else{player.classList.add('expanded');fullsizeLabel();if(player.requestFullscreen)player.requestFullscreen().catch(()=>{})}};
 let wasNativeFullscreen=false;
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===player){wasNativeFullscreen=true}else if(wasNativeFullscreen){wasNativeFullscreen=false;player.classList.remove('expanded')}fullsizeLabel()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&player.classList.contains('expanded')){player.classList.remove('expanded');fullsizeLabel()}});
 fullsizeLabel();
 $('play').onclick=()=>{if(audio.paused)audio.play().catch(e=>{$('status').textContent='Audio could not play: '+e.message});else audio.pause()};audio.onplay=()=>{$('play').textContent='Ⅱ Pause';$('play').setAttribute('aria-label','Pause song');if(!cutawayFrame)cutawayFrame=requestAnimationFrame(tickCutaway)};audio.onpause=()=>{$('play').textContent='▶ Play';$('play').setAttribute('aria-label','Play song');cutaway.pause()};audio.ontimeupdate=updateTime;audio.onerror=()=>{$('status').textContent='Audio unavailable. Open this folder through the local preview server.'};$('scrub').oninput=()=>{audio.currentTime=+$('scrub').value;updateTime()};$('zoom').onchange=()=>{px=+$('zoom').value;drawTimeline();revealSelected()};$('ruler').onclick=e=>{audio.currentTime=Math.min(plan.duration,Math.max(0,(e.clientX-$('ruler').getBoundingClientRect().left)/px));updateTime()};
 Promise.resolve().then(()=>{
  if(planUrl.origin!==location.origin)throw Error('Choose a storyboard from this workspace');
  return Promise.resolve({ok:true,json:()=>window.boardPlan});
 }).then(response=>{
  if(!response.ok)throw Error('Storyboard could not be loaded');
  return response.json();
 }).then(p=>{
  if(!p.shots?.length||!p.audioSrc||!p.version)throw Error('The storyboard is missing cards, audio or a version');
  episode=p.episode||p.title?.match(/\bS\d{2}E\d{2}\b/)?.[0];
  key=p.draftKey||(episode?'sophias-embrace-'+episode+'-'+p.version.replace(/^storyboard-/,'')+'-draft':'sophias-embrace-'+planUrl.pathname+'-draft');
  if(p.editorNotice)document.querySelector('.notice').textContent=p.editorNotice;
  baseline=structuredClone(p);plan=structuredClone(p);const linkCard=Number(params.get('card'));let restoreIndex=0;try{const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw),stored=saved.schema===2?saved.plan:saved;if(stored?.shots?.length&&stored.sourceHash===p.sourceHash&&stored.version===p.version){plan=structuredClone(stored);restoreIndex=Math.max(0,Math.min(plan.shots.length-1,Number(saved.selected)||0));persistence='Your saved edits were restored from this browser'}else persistence='Original plan loaded · saved edits belong to a different source/version; original saved copy retained'}}catch(e){saveError='Cannot read saved edits: '+(e.message||e.name)+'. Changes may not persist; export your plan to keep it.'}if(episode==='S01E02'){const repairedImages={"../../../Realm Studies/Technology and Majesty 03/Candidates/NI-20 - River of an empire.png": "Card images/opening-02-imperium-river.png", "../../../Realm Studies/Lore Revision 02/Candidates/NI-11 - Russian skyline.png": "Card images/opening-02-imperium-skyline.png"};plan.shots.forEach(s=>{if(repairedImages[s.image])s.image=repairedImages[s.image];if(!s.image){const original=baseline.shots.find(b=>b.id===s.id);if(original?.image)s.image=original.image}if(s.id==='E02-06'&&s.image==='Card images/06-husband-determination.jpg')s.image='Existing scene references/husband-determination.png';});}plan.shots.forEach(s=>{if(!s.duration)s.duration=s.end-s.start});selected=restoreIndex;$('title').textContent=plan.title||'Storyboard';document.title=$('title').textContent;$('scrub').max=plan.duration;$('endTime').textContent=clock(plan.duration);$('app').hidden=false;
  selected=Number.isInteger(linkCard)&&linkCard>0&&linkCard<=plan.shots.length?linkCard-1:restoreIndex;
  redraw();
  preview(selected);
  revealSelected();
  // The local preview server streams whole files, so buffer the song for reliable seeking.
  return fetch(mediaUrl(plan.audioSrc)).then(response=>{
   if(!response.ok)throw Error('The storyboard song could not be loaded');
   return response.blob();
  }).then(song=>{
   const url=URL.createObjectURL(song);
   // Chrome may need to reopen this URL when playback or seeking begins.
   // The browser releases it when the document closes.
   audio.addEventListener('loadedmetadata',()=>{select(selected);totals()},{once:true});
   audio.src=url;
  });
 }).catch(e=>{$('loadError').hidden=false;$('loadError').textContent=e.message+'. Open this page using a local HTTP server, rather than double-clicking the HTML file.'});
})();
