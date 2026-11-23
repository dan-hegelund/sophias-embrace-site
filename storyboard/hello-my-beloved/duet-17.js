(async () => {
  const bytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  try {
    const secret = location.hash.slice(1).replace(/-/g, '+').replace(/_/g, '/');
    const key = await crypto.subtle.importKey('raw', bytes(secret), 'AES-GCM', false, ['decrypt']);
    async function unpack(file, encoded=false) {
      if(file==='duet-17.txt'){
      const pieces=await Promise.all([0,1,2,3].map(async i=>{const r=await fetch('duet-17-'+i+'.txt');if(!r.ok)throw Error('Missing panel data');return r.text()}));
      const data=bytes(pieces.join(''));return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:data.subarray(0,12)},key,data.subarray(12))));
    }
    const response = await fetch(file);
      if (!response.ok) throw Error('Board unavailable');
      const data = encoded ? bytes(await response.text()) : new Uint8Array(await response.arrayBuffer());
      const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:data.subarray(0,12)}, key, data.subarray(12));
      return JSON.parse(new TextDecoder().decode(clear));
    }
    const [original, journey, concert, walk, reaction, front, closer, know, hall, belt, revision] = await Promise.all([unpack('board-02.bin'), unpack('journey-04.bin'), unpack('concert-05.txt',true),unpack('walk-07.txt',true),unpack('reaction-08.txt',true),unpack('front-10.txt',true),unpack('walk-11.txt',true),unpack('know-12.txt',true),unpack('hall-13.txt',true),unpack('belt-14.txt',true),unpack('duet-17.txt',true)]);
    window.boardPlan = revision.plan;
    window.boardMedia = {};
    for (const [id, encoded] of Object.entries({...original.assets,...journey.assets,...concert.assets,...walk.assets,...reaction.assets,...front.assets,...closer.assets,...know.assets,...hall.assets,...belt.assets,...revision.assets})) {
      const type = id === revision.plan.audioSrc ? 'audio/mpeg' : id.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
      window.boardMedia[id] = URL.createObjectURL(new Blob([bytes(encoded)], {type}));
    }
    const script = document.createElement('script');
    script.src = 'editor.js';
    document.body.append(script);
  } catch {
    document.querySelector('#title').textContent = 'Private storyboard';
    document.querySelector('.notice').textContent = 'Open the private storyboard link from your chat.';
    document.querySelector('#addTop').hidden = true;
  }
})();
