'use strict';
/* ═══ ZINEBY v10 — single-file app ═══
   Edit ZINEBY_CONFIG only. See README below for ENV_URL + Supabase setup. */
window.ZINEBY_CONFIG = {
  ENV_URL: '',                                       /* Cloudflare Worker JSON — overrides everything below */
  DATA_KEY_ENC: 'c78457bfdd480f895a2a070cf6eb2df3',  /* TMDB key reversed (light obfuscation) */
  DATA_PROXY: '', VIDEO_PROXY: '', DISCORD_URL: '',
  PREMIUM: { emails: ['*'], keyHash: 'WkJZLUFSRU1JVU0tNEYyUS0yMDI1' },
  ANNOUNCEMENTS: { url: '', pollMinutes: 60 },
  CONTACT_EMAIL: 'dmca@yourdomain.com',
  SUPABASE: { url: '', anon: '' },
  AI: { openaiKey: '', proxy: '', model: 'gpt-4o-mini' },
  ADS: { popunder: '', native: '', nativeContainer: '', offKeyHash: 'WkJZLU1BU1RFUi05WDdLLTIwMjU=' }
};

/* ═══ CORE ═══ */
const CFG = window.ZINEBY_CONFIG || {};
CFG.DATA_KEY = CFG.DATA_KEY || (CFG.DATA_KEY_ENC ? CFG.DATA_KEY_ENC.split('').reverse().join('') : '');
const VERSION = '10.0.0';
const SB = CFG.SUPABASE || {};
let SB_READY = !!(SB.url && SB.anon && /^https:\/\//.test(SB.url));
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const isEmbedded = () => { try{ return window.self !== window.top; }catch{ return true; } };
const isData = () => location.protocol === 'data:';
function truncMid(s, max){ s = String(s ?? ''); if(s.length <= max) return s; const a = Math.ceil((max-1)/2), b = max-1-a; return s.slice(0,a) + '…' + s.slice(-b); }
function avatarColor(s){ let h = 0; for(const ch of String(s)) h = (h*31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 48% 46%)`; }
function validEmail(v){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim()); }

/* device detection: phone / tablet / desktop */
let DEVICE = 'desktop';
function detectDevice(){
  const w = innerWidth, touch = matchMedia('(pointer:coarse)').matches;
  DEVICE = (w <= 640 || (touch && w <= 700)) ? 'phone' : (w <= 1024 || (touch && w <= 1100)) ? 'tablet' : 'desktop';
  document.body.classList.toggle('is-phone', DEVICE === 'phone');
  document.body.classList.toggle('is-tablet', DEVICE === 'tablet');
  applyLayout();
  renderCal();
}
addEventListener('resize', detectDevice);

/* storage */
const _mem = new Map();
const LS = (() => { try{ localStorage.setItem('__zt','1'); localStorage.removeItem('__zt'); return localStorage; }
                    catch{ return { getItem:k=>_mem.has(k)?_mem.get(k):null, setItem:(k,v)=>_mem.set(k,String(v)), removeItem:k=>_mem.delete(k) }; } })();
const store = {
  get(k, fb){ try{ const v = LS.getItem(k); return v == null ? fb : JSON.parse(v); }catch{ return fb; } },
  set(k, v){ try{ LS.setItem(k, JSON.stringify(v)); }catch{} },
  del(k){ try{ LS.removeItem(k); }catch{} }
};
const K = { settings:'zineby:settings', progress:'zineby:progress', list:'zineby:watchlist',
            cache:'zineby:cache', ann:'zineby:dismissedAnnouncements', session:'zineby:session',
            lastSync:'zineby:lastSync', adsUnlock:'zineby:adsUnlock', premiumUnlock:'zineby:premiumUnlock',
            lastGood:'zineby:lastGood', reminders:'zineby:reminders', seenVersion:'zineby:seenVersion' };
const FIRST_EVER = !LS.getItem('zineby:everBooted');
try{ LS.setItem('zineby:everBooted','1'); }catch{}
try{ if(navigator.storage?.persist) navigator.storage.persist(); }catch{}

const DEFAULTS = { theme:'crimson', layout:'auto', autoHide:true, clock:true, clock24:false,
                   probe:true, panicKey:true, closeConfirm:true, adsOn:true, autoplayNext:false, source:'server1' };
function getSettings(){ return Object.assign({}, DEFAULTS, store.get(K.settings, {})); }
function setSettings(patch){ const s = Object.assign(getSettings(), patch); store.set(K.settings, s); return s; }

/* env overrides */
let envReady = Promise.resolve();
(function(){
  const url = CFG.ENV_URL;
  if(!url || !/^https:\/\//.test(url)) return;
  envReady = (async ()=>{
    try{
      const ac = new AbortController(); const t = setTimeout(()=> ac.abort(), 2500);
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { signal: ac.signal });
      clearTimeout(t); if(!r.ok) return;
      const j = await r.json();
      if(j && typeof j === 'object'){
        for(const [k, v] of Object.entries(j)){
          if(k === 'ENV_URL' || k === 'DATA_KEY_ENC') continue;
          if(v && typeof v === 'object' && CFG[k] && typeof CFG[k] === 'object' && !Array.isArray(CFG[k])) Object.assign(CFG[k], v);
          else CFG[k] = v;
        }
        SB_READY = !!(CFG.SUPABASE?.url && CFG.SUPABASE.anon);
      }
    }catch{}
  })();
})();

/* logo */
const Z_PATH = 'M6 5.5 H26.5 V11 L17.5 19.5 H26.5 V26.5 H5.5 V21 L14.5 12.5 H5.5 Z';
function markSVG(){ return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${Z_PATH}" fill="var(--accent)"/></svg>`; }
function wmSVG(){ return `<svg viewBox="0 0 150 30" aria-hidden="true"><text x="0" y="23" font-family="Unbounded,system-ui,sans-serif" font-size="19" font-weight="800" letter-spacing="1.5" fill="#fff">ZINEBY</text></svg>`; }
function drawMark(c, size){
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#08060a';
  if(x.roundRect){ x.beginPath(); x.roundRect(0,0,size,size,size*.22); x.fill(); } else x.fillRect(0,0,size,size);
  x.save(); x.scale(size/32, size/32);
  x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e11d2e';
  x.fill(new Path2D(Z_PATH)); x.restore();
}

/* ═══ THEMES — each with a unique living background ═══ */
const THEMES = {
  crimson:  { name:'Crimson',  bg:[8,6,10],  surface:[24,20,28], accent:'#e11d2e', tint:'#ff4d5e', mode:'embers',
               sky:'radial-gradient(110% 70% at 50% -8%,rgba(225,29,46,.16),transparent 58%),radial-gradient(70% 50% at 50% 116%,rgba(225,29,46,.1),transparent 62%)' },
  obsidian: { name:'Obsidian', bg:[6,6,8],   surface:[24,24,28], accent:'#e8e8ee', tint:'#a7adc4', mode:'stars',
               sky:'radial-gradient(100% 60% at 50% -10%,rgba(160,170,200,.1),transparent 60%)' },
  azure:    { name:'Azure',    bg:[4,9,17],  surface:[19,27,40], accent:'#4da3ff', tint:'#9ecbff', mode:'bubbles',
               sky:'radial-gradient(110% 70% at 50% -10%,rgba(77,163,255,.16),transparent 58%),radial-gradient(80% 55% at 50% 118%,rgba(77,163,255,.1),transparent 62%)' },
  toxic:    { name:'Toxic',    bg:[5,11,7],  surface:[20,28,23], accent:'#3de86a', tint:'#a0f0c0', mode:'fireflies',
               sky:'radial-gradient(110% 70% at 50% -10%,rgba(61,232,106,.13),transparent 58%)' },
  violet:   { name:'Violet',   bg:[10,6,16], surface:[27,22,33], accent:'#a06bff', tint:'#d3b8ff', mode:'aurora',
               sky:'radial-gradient(90% 60% at 20% -8%,rgba(160,107,255,.18),transparent 56%),radial-gradient(80% 55% at 80% -12%,rgba(255,107,180,.1),transparent 58%)' },
  gilded:   { name:'Gilded',   bg:[11,8,4],  surface:[30,26,19], accent:'#e8b44d', tint:'#ffe1a0', mode:'dust',
               sky:'radial-gradient(110% 70% at 50% -10%,rgba(232,180,77,.15),transparent 58%)' }
};
function hexToRgb(h){ const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : null; }

function applyTheme(){
  const s = getSettings();
  if(!THEMES[s.theme]) setSettings({ theme:'crimson' });
  const t = THEMES[getSettings().theme];
  const rgb = hexToRgb(t.accent) || [225,29,46];
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.style.setProperty('--bg-rgb', t.bg.join(','));
  root.style.setProperty('--surf-rgb', t.surface.join(','));
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-rgb', rgb.join(','));
  root.style.setProperty('--sky', t.sky);
  FX.apply(t);
  tintFavicon();
  $('meta[name=theme-color]')?.setAttribute('content', `rgb(${t.bg.join(',')})`);
}
function tintFavicon(){
  try{
    let l = $('#favIcon');
    if(!l){ l = document.createElement('link'); l.id = 'favIcon'; l.rel = 'icon'; document.head.appendChild(l); }
    const c = document.createElement('canvas'); drawMark(c, 64);
    l.href = c.toDataURL('image/png');
  }catch{}
}

/* theme particle engine — embers / stars / bubbles / fireflies / aurora / dust */
const FX = (() => {
  const cv = $('#fx'), ctx = cv.getContext('2d');
  let W=0, H=0, ps=[], mode='embers', sprA=null, sprB=null, vis=true, onScreen=true, last=0, t0=0;
  function resize(){
    const D = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W*D; cv.height = H*D;
    ctx.setTransform(D,0,0,D,0,0);
  }
  function dot(rgb){ const s = document.createElement('canvas'); s.width = s.height = 64;
    const c = s.getContext('2d'); const g = c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,`rgba(${rgb},.95)`); g.addColorStop(.45,`rgba(${rgb},.4)`); g.addColorStop(1,`rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0,0,64,64); return s; }
  const r = (a,b) => a + Math.random()*(b-a);
  function build(t){
    const acc = hexToRgb(t.accent) || [225,29,46], tint = hexToRgb(t.tint) || acc;
    sprA = dot(acc.join(',')); sprB = dot(tint.join(','));
    mode = t.mode;
    t0 = performance.now();
    const n = mode === 'stars' ? 70 : mode === 'aurora' ? 26 : 40;
    ps = Array.from({length:n}, () => ({
      x:r(0,W), y:r(0,H), s:r(.8,2.2), sp:r(10,mode==='stars'?26:42),
      ph:r(0,6.28), f:r(.3,1), sw:r(8,30), a:r(mode==='stars'?.1:.18, mode==='stars'?.5:.6),
      c:Math.random()<.65?sprA:sprB, rot:r(0,6.28), vr:r(-1.4,1.4), z:r(.4,1)
    }));
  }
  function step(now){
    requestAnimationFrame(step);
    const dt = Math.min(.05, (now-last)/1000 || .016); last = now;
    if(!vis || document.hidden || !onScreen) return;
    if(reduceMotion || document.body.classList.contains('cinema')){ ctx.clearRect(0,0,W,H); return; }
    const t = (now - t0)/1000;
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = mode === 'stars' || mode === 'aurora' ? 'source-over' : 'lighter';
    for(const p of ps){
      if(mode === 'embers'){ p.y -= p.sp*dt; p.x += Math.sin(t*p.f+p.ph)*p.sw*dt; if(p.y < -20){ p.y = H+18; p.x = Math.random()*W; } }
      else if(mode === 'stars'){ p.y += p.sp*dt*.25; p.x += Math.sin(t*p.f*.4+p.ph)*p.sw*dt*.4; if(p.y > H+20){ p.y = -18; p.x = Math.random()*W; } }
      else if(mode === 'bubbles'){ p.y -= p.sp*dt; p.x += Math.sin(t*2*p.f+p.ph)*p.sw*dt; if(p.y < -20){ p.y = H+18; p.x = Math.random()*W; } }
      else if(mode === 'fireflies'){ p.x += Math.cos(t*p.f+p.ph)*p.sw*dt; p.y += Math.sin(t*p.f*1.3+p.ph)*p.sw*dt; if(p.x<-20)p.x=W+20; if(p.x>W+20)p.x=-20; if(p.y<-20)p.y=H+20; if(p.y>H+20)p.y=-20; }
      else if(mode === 'aurora'){ p.x += Math.cos(t*.15+p.ph)*p.sw*dt*2.2; p.y += Math.sin(t*.2+p.ph)*p.sw*dt; if(p.x<-30)p.x=W+30; if(p.x>W+30)p.x=-30; if(p.y<-30)p.y=H+30; if(p.y>H+30)p.y=-30; }
      else { /* dust */ p.y += p.sp*dt; p.x += (Math.sin(t*p.f+p.ph)*p.sw + 12)*dt; p.rot += p.vr*dt; if(p.y>H+20||p.x>W+20){ p.y=-18; p.x=Math.random()*W*.7; } }
      let a = p.a * (.5 + .5*p.z);
      if(mode === 'stars' || mode === 'fireflies') a *= .45 + .55*Math.sin(t*2*p.f+p.ph);
      const sz = p.s * (.6 + .6*p.z);
      ctx.globalAlpha = Math.max(0, a);
      ctx.drawImage(p.c, p.x - sz*2, p.y - sz*2, sz*4, sz*4);
    }
    ctx.globalAlpha = 1;
  }
  document.addEventListener('visibilitychange', ()=>{ vis = !document.hidden; });
  new IntersectionObserver(([en])=>{ onScreen = en.isIntersecting; }).observe(cv);
  addEventListener('resize', ()=>{ resize(); build(THEMES[getSettings().theme]); });
  resize(); requestAnimationFrame(step);
  return { apply(t){ resize(); build(t); } };
})();

/* layout + smart nav (hides on scroll down, shows on scroll up — Netflix style) */
const topbar = $('#topbar');
function applyLayout(){
  const m = getSettings().layout || 'auto';
  const mode = m === 'auto' ? (DEVICE === 'phone' ? 'bottom' : 'top') : m;
  document.body.classList.toggle('lay-top', mode === 'top' && DEVICE !== 'phone');
  document.body.classList.toggle('lay-bottom', mode === 'bottom');
  $$('#navSeg button').forEach(b => b.classList.toggle('on', b.dataset.navmode === m));
}
function overlayOpen(){ return P.open || sportOpen || drawerOpen || modalOpen || paletteOpen || announceOpen || trailerOpen || accOpen || aiOpen || moreOpen; }
let lastY = 0;
addEventListener('scroll', ()=>{
  const y = scrollY;
  topbar.classList.toggle('solid', y > 40);
  if(getSettings().autoHide !== false && !reduceMotion && !overlayOpen() && DEVICE !== 'phone'){
    topbar.classList.toggle('nav-hidden', y > lastY && y > 140);
  }
  lastY = y;
}, { passive:true });

/* toasts + busy */
function toast(msg){
  const box = $('#toasts');
  while(box.children.length >= 3) box.lastChild.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  box.appendChild(t);
  let timer = setTimeout(kill, 3200);
  function kill(){ clearTimeout(timer); t.classList.add('bye'); setTimeout(()=> t.remove(), 200); }
  t.addEventListener('mouseenter', ()=> clearTimeout(timer));
  t.addEventListener('mouseleave', ()=> { timer = setTimeout(kill, 1200); });
}
function btnBusy(btn, on){
  if(!btn) return;
  if(on){ if(!btn.dataset.w) btn.dataset.w = Math.max(btn.offsetWidth, 44); btn.style.minWidth = btn.dataset.w + 'px'; btn.classList.add('busy'); btn.disabled = true; }
  else { btn.classList.remove('busy'); btn.disabled = false; btn.style.minWidth = ''; }
}

/* ads — one quiet native slot on Home only, popunder only on first click */
let popunderFired = false;
function adsEnabled(){ return !!getSettings().adsOn && !!CFG.ADS?.native; }
function injectPopunder(){
  if(popunderFired || isData() || !CFG.ADS?.popunder) return;
  popunderFired = true;
  const s = document.createElement('script'); s.src = CFG.ADS.popunder; document.head.appendChild(s);
}
document.addEventListener('click', injectPopunder, { once:true });
function mountNativeBanners(){
  if(!adsEnabled()) return;
  $$('.native-slot').forEach(slot=>{
    if(slot.dataset.mounted) return;
    slot.dataset.mounted = '1';
    slot.innerHTML = `<div class="native-card"><p class="native-label">Sponsored</p><div id="${esc(CFG.ADS.nativeContainer || '')}"></div></div>`;
    const s = document.createElement('script'); s.async = true;
    s.src = CFG.ADS.native + (CFG.ADS.native.includes('?') ? '&' : '?') + 'r=' + Date.now();
    slot.appendChild(s);
  });
}
function removeAds(){ document.getElementById('zbPopunder')?.remove(); document.getElementById('zbNative')?.remove(); unmountNativeBanners(); }
function unmountNativeBanners(){ $$('.native-slot').forEach(s=>{ s.dataset.mounted = ''; s.innerHTML = ''; }); }

/* progress / list / reminders */
const getProgress = () => store.get(K.progress, {});
function saveProgress(key, entry){ const p = getProgress(); p[key] = entry; store.set(K.progress, p); queuePush(); }
const getList = () => store.get(K.list, []);
function isSaved(key){ return getList().some(x => x.type + '/' + x.id === key); }
function toggleSave(key){
  const it = ITEMS[key]; if(!it) return;
  let l = getList();
  if(isSaved(key)){ l = l.filter(x => x.type + '/' + x.id !== key); toast('Removed from My List.'); }
  else { l.unshift({ ...it, ts:Date.now() }); toast('Added to My List.'); }
  store.set(K.list, l.slice(0, 100));
  const on = isSaved(key);
  $$(`[data-save="${CSS.escape(key)}"]`).forEach(b=>{
    b.classList.toggle('saved', on);
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = on
      ? '<svg viewBox="0 0 24 24" class="ic"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
      : '<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg>';
  });
  queuePush();
}
const getReminders = () => store.get(K.reminders, []);
function addReminder(r){
  const l = getReminders();
  l.push(Object.assign({ id:'r' + Date.now(), at:null, ts:Date.now() }, r));
  store.set(K.reminders, l);
  if('Notification' in window && Notification.permission === 'default'){ try{ Notification.requestPermission(); }catch{} }
  toast('Reminder set.');
  renderCal();
}
function delReminder(id){ store.set(K.reminders, getReminders().filter(r => r.id !== id)); renderCal(); }
setInterval(()=>{
  const now = Date.now();
  getReminders().forEach(r=>{
    if(r.at && r.at <= now && !r.fired){
      r.fired = true; store.set(K.reminders, getReminders());
      toast('Reminder: ' + r.title);
      try{ if('Notification' in window && Notification.permission === 'granted') new Notification('Zineby reminder', { body: r.title }); }catch{}
    }
  });
  if(ROUTE === '/reminders') paintReminders();
}, 20000);
function flushSession(){
  if(P.open && P.item && P.key){
    const rt = (P.item.runtime || 90) * 60;
    store.set(K.progress, Object.assign({}, getProgress(), { [P.key]: {
      ...P.item, pct:clamp(P.elapsed / rt * 100, 0, 99), s:P.s || undefined, e:P.e || undefined, ts:Date.now() } }));
  }
  if(signedIn()) pushSync(false);
}
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) flushSession(); });
window.addEventListener('pagehide', ()=>{ saveScroll(); flushSession(); });

/* cards + rows */
function markLoaded(root=document){
  $$('.ph-full', root).forEach(im=>{ if(im.complete && im.naturalWidth) im.classList.add('ok'); });
}
function cardHTML(it, opts={}){
  const key = it.type + '/' + it.id;
  remember(it);
  const pr = getProgress()[key];
  const rating = it.vote ? `<span class="chip-rate">${it.vote.toFixed(1)}</span>` : '';
  const prog = pr?.pct ? `<span class="prog" style="width:${clamp(pr.pct,2,100)}%"></span>` : '';
  const saved = isSaved(key);
  const srcset = it.poster ? ` srcset="${esc(img(it.poster,'w185'))} 1x, ${esc(img(it.poster,'w342'))} 2x"` : '';
  return `<div class="card" data-card="${esc(key)}" tabindex="-1" role="link" aria-label="${esc(it.title)}">
    <div class="poster">
      ${it.poster ? `<img class="ph-blur" src="${esc(img(it.poster,'w92'))}" decoding="async" alt="" aria-hidden="true">
      <img class="ph-full" src="${esc(img(it.poster,'w342'))}"${srcset} loading="lazy" decoding="async" alt="">` : `<span class="noart">${esc((it.title||'?')[0])}</span>`}
      ${rating}
      <div class="veil"><button class="c-play" data-play="${esc(key)}" aria-label="Play"><svg viewBox="0 0 24 24" class="ic"><path d="M8 5.5v13l11-6.5z"/></svg></button></div>
      <div class="c-actions">
        <button class="c-act${saved?' saved':''}" data-save="${esc(key)}" aria-label="Save">${saved?'<svg viewBox="0 0 24 24" class="ic"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>':'<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg>'}</button>
      </div>
      ${prog}
    </div>
    ${opts.noMeta ? '' : `<div class="c-meta"><span class="c-title">${esc(it.title)}</span><span class="c-sub">${esc(it.year || '')}${it.year ? ' · ' : ''}${it.type === 'tv' ? 'TV' : 'Movie'}</span></div>`}
  </div>`;
}
function cwCardHTML(v){
  const key = v.type + '/' + v.id;
  remember(v);
  const rt = v.rt || (v.type === 'tv' ? 45 : 110);
  const left = Math.max(1, Math.round(rt * (1 - (v.pct || 0)/100)));
  const sub = (v.type === 'tv' && v.s) ? `S${v.s} E${v.e} · ${left}m left` : (v.pct ? `${Math.round(v.pct)}% · ${left}m left` : 'Resume');
  const still = v.backdrop ? img(v.backdrop,'w780') : (v.poster ? img(v.poster,'w342') : null);
  return `<div class="card cw" data-card="${esc(key)}" tabindex="-1" role="link" aria-label="${esc(v.title)}">
    <div class="still">
      ${still ? `<img src="${esc(still)}" loading="lazy" alt="">` : `<span class="noart">${esc((v.title||'?')[0])}</span>`}
      <span class="prog" style="width:${clamp(v.pct||2,2,100)}%"></span>
      <div class="veil"><button class="c-play" data-play="${esc(key)}" aria-label="Resume"><svg viewBox="0 0 24 24" class="ic"><path d="M8 5.5v13l11-6.5z"/></svg></button></div>
    </div>
    <div class="c-meta"><span class="c-title">${esc(v.title)}</span><span class="c-sub">${esc(sub)}</span></div>
  </div>`;
}
function rankCardHTML(it, n){ return `<div class="rank-item"><span class="rank-num" aria-hidden="true">${n}</span>${cardHTML(it, { noMeta:true })}</div>`; }
function matchCardHTML(m){
  const live = m.state === 'in';
  const score = (m.hs != null || m.as != null) ? `${m.hs ?? 0}<span class="m-sep">:</span>${m.as ?? 0}` : `<span class="m-sep">vs</span>`;
  let status;
  if(live) status = `<span class="clock">${esc(m.clock || 'Live')}</span>`;
  else if(m.state === 'post') status = 'Final';
  else { const d = m.date ? new Date(m.date) : null; status = d ? d.toLocaleString([], { weekday:'short', hour:'numeric', minute:'2-digit' }) : 'Scheduled'; }
  const canWatch = m.state !== 'post';
  return `<div class="match" tabindex="-1" aria-label="${esc(m.home)} vs ${esc(m.away)}">
    <div class="m-top"><span>${esc(m.league)}</span>${live ? `<span class="m-live"><i></i>LIVE</span>` : ''}</div>
    <div class="m-row"><span class="m-team">${esc(m.home)}</span><span class="m-score">${score}</span><span class="m-team ta">${esc(m.away)}</span></div>
    <div class="m-status">${status}${canWatch ? `<button class="m-watch" data-home="${esc(m.home)}" data-away="${esc(m.away)}">Watch</button>` : ''}</div>
  </div>`;
}
function rowHTML(id, label, items, opts={}){
  if(!items.length) return '';
  const inner = opts.rank ? items.map((x,i)=>rankCardHTML(x,i+1)).join('')
              : opts.cw ? items.map(cwCardHTML).join('')
              : opts.matches ? items.map(matchCardHTML).join('')
              : items.map(x=>cardHTML(x,opts)).join('');
  const title = opts.href
    ? `<a class="row-link" href="${esc(opts.href)}">${esc(label)}<span class="chev">›</span></a>`
    : esc(label);
  return `<section class="row" data-row="${esc(id)}">
    <div class="row-head"><h2>${title}</h2>
      <div class="row-arrows"><button class="ibtn sm" data-rleft aria-label="Back">‹</button><button class="ibtn sm" data-rright aria-label="Forward">›</button></div>
    </div>
    <div class="row-scroll" tabindex="0" aria-label="${esc(label)}">${inner}</div>
  </section>`;
}
function wireRow(section){
  const sc = $('.row-scroll', section); if(!sc) return;
  driftRows.push(sc);
  markLoaded(section);
  const step = ()=> sc.clientWidth * .88;
  $('[data-rleft]', section)?.addEventListener('click', ()=> sc.scrollBy({ left:-step(), behavior:'smooth' }));
  $('[data-rright]', section)?.addEventListener('click', ()=> sc.scrollBy({ left:step(), behavior:'smooth' }));
  sc.addEventListener('wheel', e=>{
    if(!e.deltaY || sc.scrollWidth <= sc.clientWidth) return;
    const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
    if((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && sc.scrollLeft > 0)){ e.preventDefault(); sc.scrollLeft += e.deltaY; sc.dataset.pause = '1'; }
  }, { passive:false });
  ['pointerenter','touchstart','wheel'].forEach(ev=> sc.addEventListener(ev, ()=>{ sc.dataset.pause = '1'; clearTimeout(sc._pt); }));
  sc.addEventListener('pointerleave', ()=>{ sc._pt = setTimeout(()=> delete sc.dataset.pause, 5000); });
}
function wireDragScroll(el){
  if(!finePointer) return;
  let down = false, sx = 0, sl = 0, moved = 0;
  el.addEventListener('pointerdown', e=>{ if(e.button !== 0) return; down = true; moved = 0; sx = e.clientX; sl = el.scrollLeft; el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', e=>{
    if(!down) return;
    const dx = e.clientX - sx;
    moved = Math.max(moved, Math.abs(dx));
    if(moved > 4){ try{ el.setPointerCapture(e.pointerId); }catch{} el.scrollLeft = sl - dx; }
  });
  const up = ()=>{ down = false; el.style.cursor = ''; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e=>{ if(moved > 6){ e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
}
const driftRows = [];
let lastDrift = 0;
(function driftLoop(ts){
  requestAnimationFrame(driftLoop);
  if(ts - lastDrift < 130) return;
  lastDrift = ts;
  if(reduceMotion || document.hidden) return;
  for(let i = driftRows.length - 1; i >= 0; i--){
    const sc = driftRows[i];
    if(!sc.isConnected){ driftRows.splice(i, 1); continue; }
    if(sc.dataset.pause || sc.scrollWidth <= sc.clientWidth + 4) continue;
    sc._dir = sc._dir || 1;
    if(sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 2) sc._dir = -1;
    if(sc.scrollLeft <= 0) sc._dir = 1;
    sc.scrollLeft += sc._dir * .4;
  }
})(0);
document.addEventListener('load', e=>{ if(e.target.classList?.contains('ph-full')) e.target.classList.add('ok'); }, true);

/* calendar + clock */
let calOpen = false;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
let calM = new Date().getMonth(), calY = new Date().getFullYear();
function renderCal(){
  const grid = $('#calGrid'); if(!grid) return;
  $('#calTitle').textContent = `${MONTHS[calM]} ${calY}`;
  const startDow = new Date(calY, calM, 1).getDay();
  const daysIn = new Date(calY, calM + 1, 0).getDate();
  const daysPrev = new Date(calY, calM, 0).getDate();
  const today = new Date();
  const remDays = new Set(getReminders().filter(r => r.at).map(r => { const d = new Date(r.at); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }));
  let html = ['S','M','T','W','T','F','S'].map(d => `<span class="cal-dow">${d}</span>`).join('');
  for(let i = startDow - 1; i >= 0; i--) html += `<span class="cal-day out">${daysPrev - i}</span>`;
  for(let d = 1; d <= daysIn; d++){
    const isToday = d === today.getDate() && calM === today.getMonth() && calY === today.getFullYear();
    const hasRem = remDays.has(calY + '-' + calM + '-' + d);
    html += `<button class="cal-day${isToday ? ' today' : ''}${hasRem ? ' rem' : ''}">${d}</button>`;
  }
  const trail = (7 - ((startDow + daysIn) % 7)) % 7;
  for(let d = 1; d <= trail; d++) html += `<span class="cal-day out">${d}</span>`;
  grid.innerHTML = html;
  $('#calFull').textContent = new Date().toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
}
function openCal(){
  if(calOpen) return closeCal();
  closeAccPop(); closePalette();
  calM = new Date().getMonth(); calY = new Date().getFullYear();
  calOpen = true; renderCal();
  $('#calPop').classList.toggle('is-phone', DEVICE === 'phone');
  $('#calPop').hidden = false; $('#calCatch').hidden = false;
}
function closeCal(){
  if(!calOpen) return;
  calOpen = false;
  $('#calPop').hidden = true; $('#calCatch').hidden = true;
}
 $('#calCatch').addEventListener('click', closeCal);
 $('#calPrev').addEventListener('click', ()=>{ calM--; if(calM < 0){ calM = 11; calY--; } renderCal(); });
 $('#calNext').addEventListener('click', ()=>{ calM++; if(calM > 11){ calM = 0; calY++; } renderCal(); });
 $('#calToday').addEventListener('click', ()=>{ calM = new Date().getMonth(); calY = new Date().getFullYear(); renderCal(); });
function tickClock(){
  const s = getSettings();
  const chip = $('#clockFix');
  if(!s.clock || DEVICE === 'phone'){ chip.style.display = 'none'; return; }
  chip.style.display = '';
  const d = new Date();
  const off = -d.getTimezoneOffset() / 60;
  $('#clockTxt').textContent = `${d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:!s.clock24 })} · GMT${off >= 0 ? '+' : ''}${off % 1 ? off.toFixed(1) : off}`;
}
 $('#clockFix').addEventListener('click', ()=>{ calOpen ? closeCal() : openCal(); });
function updOnline(){ $('#offlineBar').hidden = navigator.onLine; }
function updLiveDots(n){
  $$('.live-dot[data-sports]').forEach(el => el.hidden = n === 0);
}

/* ═══ API — TMDB ═══ */
const API_BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
function apiUrl(path, params={}){
  const q = new URLSearchParams(params); q.set('api_key', CFG.DATA_KEY);
  return API_BASE + path + '?' + q.toString();
}
function cacheGet(k, ttl){ const e = store.get(K.cache, {})[k]; return (e && Date.now() - e.t < ttl) ? e.d : null; }
function cacheSet(k, d){
  const c = store.get(K.cache, {}); c[k] = { t:Date.now(), d };
  while(JSON.stringify(c).length > 2000000){ const o = Object.keys(c).sort((a,b)=>c[a].t - c[b].t)[0]; if(!o) break; delete c[o]; }
  store.set(K.cache, c);
}
async function apiFetch(path, params={}, long=false){
  await envReady;
  const target = API_BASE + path + '?' + new URLSearchParams(params).toString();
  const hit = cacheGet(target, long ? 864e5 : 6e5);
  if(hit) return hit;
  const r = await fetch(apiUrl(path, params));
  if(!r.ok) throw new Error('http ' + r.status);
  const d = await r.json();
  cacheSet(target, d);
  return d;
}
const img = (p, size) => p ? IMG + size + p : null;
function normalizeItem(d){
  const type = d.media_type === 'tv' || d.first_air_date ? 'tv' : 'movie';
  return { type, id:d.id, title:d.title || d.name || '', year:(d.release_date || d.first_air_date || '').slice(0,4),
           poster:d.poster_path || null, backdrop:d.backdrop_path || null, vote:d.vote_average || 0, runtime:d.runtime };
}
const ITEMS = {};
function remember(it){ if(it?.id) ITEMS[it.type + '/' + it.id] = it; }

/* ═══ ESPN live sports — 12 leagues, free, no key ═══ */
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES = [
  { key:'soccer/eng.1', name:'Premier League', short:'EPL' },
  { key:'soccer/esp.1', name:'LaLiga', short:'LaLiga' },
  { key:'soccer/ita.1', name:'Serie A', short:'Serie A' },
  { key:'soccer/ger.1', name:'Bundesliga', short:'BL' },
  { key:'soccer/fra.1', name:'Ligue 1', short:'L1' },
  { key:'soccer/uefa.champions', name:'Champions League', short:'UCL' },
  { key:'soccer/usa.1', name:'MLS', short:'MLS' },
  { key:'basketball/nba', name:'NBA', short:'NBA' },
  { key:'hockey/nhl', name:'NHL', short:'NHL' },
  { key:'football/nfl', name:'NFL', short:'NFL' },
  { key:'baseball/mlb', name:'MLB', short:'MLB' },
  { key:'mma/ufc', name:'UFC', short:'UFC' }
];
const num = v => (v != null && v !== '') ? +v : null;
async function fetchLeague(l){
  const url = `${ESPN}${l.key}/scoreboard`;
  const hit = cacheGet(url, 6e4);
  if(hit) return hit;
  const r = await fetch(url); if(!r.ok) throw 0;
  const j = await r.json();
  const out = (j.events || []).map(e => {
    const cs = e.competitions?.[0]?.competitors || [];
    const home = cs.find(c => c.homeAway === 'home') || {}, away = cs.find(c => c.homeAway === 'away') || {};
    return { id:e.id, lkey:l.key, league:l.name,
      home:home.team?.displayName || 'Home', away:away.team?.displayName || 'Away',
      hs:num(home.score), as:num(away.score),
      state:e.status?.type?.state || 'pre', clock:e.status?.displayClock || '', date:e.date || '' };
  });
  cacheSet(url, out);
  return out;
}
async function fetchAllSports(){
  const res = await Promise.all(LEAGUES.map(l => fetchLeague(l).catch(()=> [])));
  return res.flat();
}
const SPORT_STREAMS = [
  { name:'Source 1', url:()=> 'https://v2.sportsurge.net/home2/' },
  { name:'Source 2', url:()=> 'https://the.streameast.app/' },
  { name:'Source 3', url:()=> 'https://streamed.su/' },
  { name:'Source 4', url:()=> 'https://methstreams.com/' }
];

/* sport player */
let sportOpen = false, spIdx = 0, spLastFocus = null;
function openSportPlayer(m){
  spLastFocus = document.activeElement;
  sportOpen = true; spIdx = 0;
  $('#spTitle').textContent = `${m.home} vs ${m.away}`;
  loadSportSrc(0);
  $('#sportPlayer').hidden = false;
  document.body.classList.add('locked','cinema');
  updateLock();
}
function loadSportSrc(i){
  spIdx = i;
  const s = SPORT_STREAMS[i]; if(!s) return;
  $('#sportFrame').src = s.url();
  $$('#sportPlayer [data-sportsrc]').forEach((b,j)=> b.classList.toggle('on', j === i));
}
function closeSportPlayer(silent){
  if(!sportOpen) return;
  sportOpen = false;
  $('#sportFrame').src = 'about:blank';
  $('#sportPlayer').hidden = true;
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  document.body.classList.remove('locked','cinema');
  updateLock();
  if(!silent) toast('Sports player closed.');
  spLastFocus?.focus?.();
}
 $('#spBack').addEventListener('click', ()=> closeSportPlayer());
 $('#spTab').addEventListener('click', ()=> window.open(SPORT_STREAMS[spIdx]?.url() || 'about:blank', '_blank', 'noopener'));
 $('#spFull').addEventListener('click', ()=>{
  try{
    if(document.fullscreenElement) document.exitFullscreen();
    else $('#sportPlayer').requestFullscreen().catch(()=> toast('Fullscreen is blocked here.'));
  }catch{ toast('Fullscreen is blocked here.'); }
});
 $$('#sportPlayer [data-sportsrc]').forEach(b => b.addEventListener('click', ()=> loadSportSrc(+b.dataset.sportsrc)));

/* ═══ MOVIE PLAYER ═══ */
const SERVERS = [
  { id:'server1', name:'Server 1', fmt:[
      (t,id,s,e) => t==='movie' ? `https://vidsrc.to/embed/movie/${id}` : `https://vidsrc.to/embed/tv/${id}/${s}/${e}` ]},
  { id:'server2', name:'Server 2', fmt:[
      (t,id,s,e) => t==='movie' ? `https://vidsrc.sbs/embed/movie/${id}` : `https://vidsrc.sbs/embed/tv/${id}/${s}/${e}`,
      (t,id,s,e) => t==='movie' ? `https://vidsrc.sbs/embed/movie?tmdb=${id}` : `https://vidsrc.sbs/embed/tv?tmdb=${id}&season=${s}&episode=${e}` ]},
  { id:'server3', name:'Server 3', fmt:[
      (t,id,s,e) => t==='movie' ? `https://vidking.net/embed/movie/${id}` : `https://vidking.net/embed/tv/${id}/${s}/${e}` ]},
  { id:'server4', name:'Server 4', fmt:[
      (t,id,s,e) => t==='movie' ? `https://vidfast.pro/movie/${id}?autoPlay=true` : `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true&autoNext=true` ]}
];
function popOutStream(url, title){
  const w = window.open('about:blank', '_blank');
  if(!w){ toast('Pop-up blocked.'); return; }
  try{
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title || 'Playing')}</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${esc(url)}" referrerpolicy="origin" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`);
    w.document.close();
  }catch{ try{ w.location.href = url; }catch{} }
}
const frame = $('#streamFrame');
const P = { open:false, item:null, key:'', si:0, fi:0, attempts:0, max:0, timer:0, tick:0,
            elapsed:0, s:0, e:0, veiled:true, idle:0, lastFocus:null, endPill:false,
            seasonList:[], epOpen:false, epReq:0 };
let probeAbort = null;
const fmtDur = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`; };
async function preflight(){
  const box = $('#veilProbes');
  const lg = store.get(K.lastGood, -1);
  const order = lg >= 0 && lg < SERVERS.length ? [lg, ...SERVERS.map((_,i)=>i).filter(i=>i!==lg)] : SERVERS.map((_,i)=>i);
  box.innerHTML = SERVERS.map((s,i)=>`<span class="probe" data-i="${i}">${esc(s.name)}<span class="st chk"></span></span>`).join('');
  const ac = new AbortController(); probeAbort = ac;
  const results = await Promise.all(order.map(async i=>{
    let ok = false;
    try{
      const t = setTimeout(()=>ac.abort(), 3200);
      await fetch('https://vidsrc.to/embed/movie/550', { mode:'no-cors', cache:'no-store', signal:ac.signal });
      clearTimeout(t); ok = true;
    }catch{}
    const el = box.querySelector(`[data-i="${i}"]`);
    if(el){ el.querySelector('.st').className = 'st ' + (ok ? 'ok' : ''); if(ok) el.classList.add('ok'); }
    return { i, ok };
  }));
  probeAbort = null;
  if(!P.open) return -1;
  const good = results.find(r => r.ok);
  return good ? good.i : -1;
}
async function openPlayer(key, preset, s, e){
  if(P.open) return;
  closeDrawer(); closeAccPop(); closePalette(); closeAi(); closeCal();
  const [type, idStr] = key.split('/');
  const id = +idStr;
  let item = preset || ITEMS[key];
  if(!item?.runtime || (type === 'tv' && !item.seasons)){
    try{
      const d = await apiFetch(`/${type}/${id}`, { append_to_response:'videos' }, true);
      item = Object.assign({}, item || {}, normalizeItem(d), { seasons:d.number_of_seasons || 1 });
      item._seasonsRaw = d.seasons || [];
    }catch{ return toast("That didn't load. Try again."); }
  }
  if(isEmbedded()){
    popOutStream(SERVERS[0].fmt[0](type, id, s || 1, e || 1), item.title);
    toast('Opened in a private window — embeds can\'t play here.');
    return;
  }
  P.item = item; P.key = key;
  P.seasonList = (item._seasonsRaw || []).filter(x => x.season_number > 0 && x.episode_count > 0)
    .map(x => ({ n:x.season_number, count:x.episode_count }));
  if(!P.seasonList.length && type === 'tv')
    P.seasonList = Array.from({ length: Math.max(item.seasons || 1, 1) }, (_, i) => ({ n:i+1, count:0 }));
  const pr = getProgress()[key];
  P.s = (s != null ? s : (pr?.s) || (type === 'tv' ? 1 : 0));
  P.e = (e != null ? e : (pr?.e) || (type === 'tv' ? 1 : 0));
  P.elapsed = pr ? Math.round((pr.pct / 100) * (item.runtime || 90) * 60) : 0;
  const idx = SERVERS.findIndex(x => x.id === getSettings().source);
  P.si = idx >= 0 ? idx : 0; P.fi = 0;
  P.attempts = 0; P.max = SERVERS.reduce((n, x) => n + x.fmt.length, 0);
  P.open = true; P.veiled = true; P.endPill = false; P.epOpen = false;
  P.lastFocus = document.activeElement;
  $('#plTitle').textContent = item.title;
  $('#plMeta').textContent = [item.year, type === 'tv' ? `S${P.s} E${P.e}` : (item.runtime ? `${Math.floor(item.runtime/60)}h ${item.runtime%60}m` : '')].filter(Boolean).join(' · ');
  $('#plEps').hidden = type !== 'tv';
  $('#epSheet').hidden = true;
  $('#plSrvPop').hidden = true;
  $('#player').hidden = false;
  $('#player').classList.remove('hide-ui');
  document.body.classList.add('locked','cinema');
  $('#plVeil').hidden = false; $('#plFail').hidden = true;
  $('#pillNext').hidden = true; $('#pillAlt').hidden = true; $('#plNext').hidden = true;
  $('#veilTitle').textContent = item.title;
  updateLock();
  startTicker();
  wakeUI();
  if(getSettings().probe){
    $('#veilMsg').textContent = 'Finding a working server…';
    const pick = await preflight();
    if(!P.open) return;
    if(pick >= 0){ P.si = pick; P.fi = 0; $('#veilMsg').textContent = 'Ready — starting…'; }
    else $('#veilMsg').textContent = 'No host answered — connecting anyway…';
  } else {
    $('#veilMsg').textContent = 'Preparing your stream…';
    $('#veilProbes').innerHTML = '';
  }
  loadStream();
}
function paintSrvPop(){
  $('#plSrvPop').innerHTML = SERVERS.map((x,i)=>`
    <button class="srv-item${i === P.si ? ' on' : ''}" data-i="${i}">${esc(x.name)}${i === P.si ? '<span style="margin-left:auto;color:var(--accent)">✓</span>' : ''}</button>`).join('');
}
function status(txt){ $('#plStatusTxt').textContent = txt; }
function loadStream(){
  clearTimeout(P.timer);
  P.veiled = true;
  $('#plVeil').hidden = false; $('#plFail').hidden = true;
  $('#pillNext').hidden = true; $('#pillAlt').hidden = true; $('#plNext').hidden = true;
  paintSrvPop();
  $('#plSrv').textContent = SERVERS[P.si].name;
  status(`${SERVERS[P.si].name} · connecting…`);
  frame.src = SERVERS[P.si].fmt[P.fi](P.item.type === 'tv' ? 'tv' : 'movie', P.item.id, P.s, P.e);
  P.timer = setTimeout(()=> advance(false), 10000);
  setTimeout(()=>{ if(P.veiled && P.open){ $('#pillNext').hidden = false; $('#pillAlt').hidden = SERVERS[P.si].fmt.length < 2; wakeUI(); } }, 9000);
  if(P.epOpen) paintEpList();
}
frame.addEventListener('load', ()=>{
  if(!P.open) return;
  clearTimeout(P.timer);
  $('#pillNext').hidden = true; $('#pillAlt').hidden = true;
  P.veiled = false;
  setTimeout(()=>{ if(!P.veiled) $('#plVeil').hidden = true; }, 250);
  status(`Playing via ${SERVERS[P.si].name}`);
  store.set(K.lastGood, P.si);
});
function advance(manual){
  if(!P.open || !P.veiled) return;
  const cur = SERVERS[P.si];
  if(P.fi + 1 < cur.fmt.length) P.fi++;
  else { P.si = (P.si + 1) % SERVERS.length; P.fi = 0; if(!manual) toast(`Switching to ${SERVERS[P.si].name}…`); }
  P.attempts++;
  if(P.attempts >= P.max && !manual){
    P.veiled = false;
    $('#plVeil').hidden = true; $('#plFail').hidden = false;
    status('No servers responding');
    return;
  }
  loadStream();
}
 $('#plSrv').addEventListener('click', ()=>{
  const pop = $('#plSrvPop');
  pop.hidden = !pop.hidden;
  if(!pop.hidden) paintSrvPop();
});
 $('#plSrvPop').addEventListener('click', e=>{
  const b = e.target.closest('[data-i]'); if(!b) return;
  $('#plSrvPop').hidden = true;
  P.si = +b.dataset.i; P.fi = 0;
  P.attempts = SERVERS.slice(0, P.si).reduce((n, x) => n + x.fmt.length, 0);
  loadStream();
});
 $('#failRetry').addEventListener('click', ()=>{ P.attempts = 0; P.si = 0; P.fi = 0; loadStream(); });
 $('#failPop').addEventListener('click', ()=> popOutStream(SERVERS[P.si].fmt[P.fi](P.item.type, P.item.id, P.s, P.e), P.item.title));
 $('#pillNext').addEventListener('click', ()=>{ P.si = (P.si + 1) % SERVERS.length; P.fi = 0; loadStream(); });
 $('#pillAlt').addEventListener('click', ()=>{ P.fi++; loadStream(); });
 $('#plPop').addEventListener('click', ()=> popOutStream(SERVERS[P.si].fmt[P.fi](P.item.type, P.item.id, P.s, P.e), P.item.title));
 $('#plBack').addEventListener('click', ()=> closePlayer());
function toggleFull(){
  try{
    if(document.fullscreenElement) document.exitFullscreen();
    else $('#player').requestFullscreen().then(()=> wakeUI()).catch(()=> toast('Fullscreen is blocked here.'));
  }catch{ toast('Fullscreen is blocked here.'); }
}
 $('#plFull').addEventListener('click', toggleFull);
(function(){
  const sc = $('#plScrub');
  let dragging = false;
  const setFromX = x =>{
    const r = sc.getBoundingClientRect();
    P.elapsed = Math.round(clamp((x - r.left) / r.width, 0, 1) * (P.item?.runtime || 90) * 60);
    paintSeek();
  };
  sc.addEventListener('pointerdown', e=>{
    if(!P.open) return;
    dragging = true;
    try{ sc.setPointerCapture(e.pointerId); }catch{}
    setFromX(e.clientX);
  });
  sc.addEventListener('pointermove', e=>{ if(dragging) setFromX(e.clientX); });
  const end = ()=>{ dragging = false; };
  sc.addEventListener('pointerup', end);
  sc.addEventListener('pointercancel', end);
})();
 $('#plEps').addEventListener('click', ()=> P.epOpen ? closeEpPanel() : openEpPanel());
 $('#epX').addEventListener('click', closeEpPanel);
function openEpPanel(){
  if(!P.item || P.item.type !== 'tv') return;
  P.epOpen = true;
  $('#plEps').classList.add('on');
  $('#epSheet').hidden = false;
  wakeUI();
  const sel = $('#epSel');
  sel.innerHTML = P.seasonList.map(x => `<option value="${x.n}" ${x.n === P.s ? 'selected' : ''}>Season ${x.n}</option>`).join('');
  sel.onchange = ()=> paintEpList();
  paintEpList();
}
function closeEpPanel(){
  P.epOpen = false;
  $('#plEps').classList.remove('on');
  $('#epSheet').hidden = true;
}
async function paintEpList(){
  const list = $('#epList2');
  const sn = +($('#epSel').value || P.s || 1);
  const req = ++P.epReq;
  list.innerHTML = `<div class="sk" style="height:56px;margin:5px"></div><div class="sk" style="height:56px;margin:5px"></div>`;
  let eps = [];
  try{
    const sd = await apiFetch(`/tv/${P.item.id}/season/${sn}`, {}, true);
    if(req !== P.epReq || !P.open) return;
    eps = (sd.episodes || []).map(ep => ({ n:ep.episode_number, name:ep.name || '', air:ep.air_date || '' }));
  }catch{
    const meta = P.seasonList.find(x => x.n === sn);
    eps = Array.from({ length: meta?.count || 0 }, (_, i) => ({ n:i+1, name:'', air:'' }));
  }
  if(!eps.length){ list.innerHTML = `<p style="padding:18px;text-align:center;color:var(--faint)">Episodes didn't load.</p>`; return; }
  list.innerHTML = eps.map(ep => `
    <button class="ep-item${sn === P.s && ep.n === P.e ? ' cur' : ''}" data-s="${sn}" data-e="${ep.n}">
      <span class="n">${ep.n}</span>
      <span class="t"><b>${esc(ep.name || 'Episode ' + ep.n)}</b>${ep.air ? `<small>${esc(ep.air)}</small>` : ''}</span>
    </button>`).join('');
}
 $('#epList2').addEventListener('click', e=>{
  const b = e.target.closest('[data-e]');
  if(!b) return;
  playEpisode(+b.dataset.s, +b.dataset.e);
});
function playEpisode(s, e){
  P.s = s; P.e = e;
  P.elapsed = 0; P.endPill = false;
  clearInterval(P.endTimer);
  $('#plMeta').textContent = [P.item.year, `S${P.s} E${P.e}`].filter(Boolean).join(' · ');
  closeEpPanel();
  loadStream();
}
function startTicker(){
  clearInterval(P.tick);
  P.tick = setInterval(()=>{
    if(document.hidden) return;
    P.elapsed += 3;
    paintSeek();
    const rt = (P.item.runtime || 90) * 60;
    saveProgress(P.key, { ...P.item, pct:clamp(P.elapsed / rt * 100, 0, 99), s:P.s || undefined, e:P.e || undefined, rt:P.item.runtime, ts:Date.now() });
    if(P.item.type === 'tv' && P.elapsed >= rt) handleEnd();
  }, 3000);
}
function paintSeek(){
  if(!P.item) return;
  const rt = (P.item.runtime || 90) * 60;
  const pct = clamp(P.elapsed / rt * 100, 0, 99);
  $('#plFill').style.width = pct.toFixed(1) + '%';
  $('#plElapsed').textContent = fmtDur(P.elapsed);
  $('#plTotal').textContent = fmtDur(rt);
  const remain = rt - P.elapsed;
  $('#plEnds').textContent = remain > 0 ? `Ends at ${new Date(Date.now() + remain * 1000).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}` : '';
}
function handleEnd(){
  if(P.endPill) return;
  P.endPill = true;
  wakeUI();
  if(getSettings().autoplayNext){
    let n = 10;
    $('#plNext').hidden = false;
    $('#nextTxt').textContent = `Next episode in ${n}s`;
    P.endTimer = setInterval(()=>{
      n--; $('#nextTxt').textContent = `Next episode in ${n}s`;
      if(n <= 0){ clearInterval(P.endTimer); $('#plNext').hidden = true; P.endPill = false; nextEpisode(); }
    }, 1000);
  } else {
    $('#plNext').hidden = false;
    $('#nextTxt').textContent = 'Episode finished.';
  }
}
 $('#nextCancel').addEventListener('click', ()=>{
  clearInterval(P.endTimer);
  $('#plNext').hidden = true; P.endPill = false;
  $('#nextTxt').textContent = 'Episode finished.';
});
function nextEpisode(){
  P.e++;
  const meta = P.seasonList.find(x => x.n === P.s);
  if(meta?.count && P.e > meta.count){
    if(P.seasonList.find(x => x.n === P.s + 1)){ P.s++; P.e = 1; } else P.e = meta.count;
  }
  P.elapsed = 0; P.endPill = false;
  loadStream();
}
function wakeUI(){
  const pl = $('#player');
  pl.classList.remove('hide-ui');
  clearTimeout(P.idle);
  if(P.open && !P.veiled && !P.endPill) P.idle = setTimeout(()=> pl.classList.add('hide-ui'), 3500);
}
 $('#plWake').addEventListener('click', wakeUI);
['#plTop','#plBot'].forEach(sel=>{
  $(sel).addEventListener('pointermove', wakeUI, { passive:true });
  $(sel).addEventListener('touchstart', wakeUI, { passive:true });
});
function closePlayer(silent){
  if(!P.open) return;
  probeAbort?.abort?.(); probeAbort = null;
  clearInterval(P.tick); clearTimeout(P.timer); clearTimeout(P.idle); clearInterval(P.endTimer);
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  if(!silent) toast('Playback closed.');
  frame.src = 'about:blank';
  $('#player').hidden = true;
  P.open = false; P.epOpen = false;
  document.body.classList.remove('locked','cinema');
  updateLock();
  P.lastFocus?.focus?.();
}

/* ═══ ROUTER + PAGES ═══ */
const view = $('#view');
let ROUTE = '/', lastRendered = null;
let heroTimer = 0, remTick = 0, dataT = 0;
const T0 = performance.now();
let bootGone = false;
function hideBoot(){
  if(bootGone) return;
  bootGone = true;
  const wait = Math.max(0, (FIRST_EVER ? 420 : 0) - (performance.now() - T0));
  setTimeout(()=>{
    const b = $('#boot'); if(!b) return;
    b.classList.add('gone');
    setTimeout(()=> b.remove(), 320);
  }, wait);
}
function stopTimers(){ clearInterval(heroTimer); heroTimer = 0; clearInterval(remTick); remTick = 0; }
function setActiveNav(name){
  $$('.nav-it,.ptab').forEach(a=>{
    const on = a.dataset.nav === name || (name === 'reminders' && a.dataset.nav === 'more');
    a.classList.toggle('on', on);
    if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
function staggerIn(){
  $$('[data-stagger]').forEach((el,i)=>{
    el.style.transitionDelay = (Math.min(i,5) * 45) + 'ms';
    requestAnimationFrame(()=> el.classList.add('in'));
  });
}
let internalNav = false;
function saveScroll(){
  try{ const m = JSON.parse(sessionStorage.getItem('zineby:scroll') || '{}'); m[ROUTE] = scrollY; sessionStorage.setItem('zineby:scroll', JSON.stringify(m)); }catch{}
}
function restoreScroll(path){
  try{ const m = JSON.parse(sessionStorage.getItem('zineby:scroll') || '{}'); if(m[path]) setTimeout(()=> scrollTo({ top:m[path] }), 80); }catch{}
}
function go(path){
  saveScroll();
  ROUTE = path;
  internalNav = true;
  try{ if(('#' + path) !== location.hash) location.hash = path; }catch{}
  if(lastRendered !== path) render(path);
}
window.addEventListener('hashchange', ()=>{
  if(location.hash.includes('access_token')) return;
  const p = location.hash.slice(1) || '/';
  const wasInternal = internalNav;
  internalNav = false;
  ROUTE = p; render(p);
  if(!wasInternal) restoreScroll(p);
});
function render(path){
  if(lastRendered === path) return;
  lastRendered = path;
  stopTimers();
  if(P.open) closePlayer(true);
  if(sportOpen) closeSportPlayer(true);
  scrollTo({ top:0 });
  $$('.native-slot').forEach(s => s.dataset.mounted = '');
  if(path.startsWith('/service/')){ const [, , pid, ...rest] = path.split('/'); renderService(+pid, decodeURIComponent(rest.join('/'))); }
  else if(path.startsWith('/detail/')){ const [, , type, id] = path.split('/'); renderDetail(type, +id); }
  else if(path === '/movies') renderGrid('movie');
  else if(path === '/tv') renderGrid('tv');
  else if(path === '/sports') renderSports();
  else if(path === '/mylist') renderMyList();
  else if(path === '/search') renderSearch();
  else if(path === '/reminders') renderReminders();
  else if(path === '/dmca') renderDMCA();
  else renderHome();
  updateLock();
  hideBoot();
}
function refreshRoute(){ lastRendered = null; render(ROUTE); }

const SERVICES = [
  { pid:8, name:'Netflix', ab:'N', color:'#e50914' },
  { pid:119, name:'Prime Video', ab:'P', color:'#00A8E1' },
  { pid:337, name:'Disney+', ab:'D+', color:'#9fc1ff' },
  { pid:15, name:'Hulu', ab:'H', color:'#1ce783' },
  { pid:1899, name:'Max', ab:'M', color:'#a684ff' },
  { pid:350, name:'Apple TV+', ab:'tv', color:'#d9d9de' },
  { pid:531, name:'Paramount+', ab:'P+', color:'#3f8cff' },
  { pid:2739, name:'Peacock', ab:'Pk', color:'#fcd435' }
];
const ROW_RETRY = {};
function continueList(){
  return Object.entries(getProgress()).sort((a,b)=>b[1].ts - a[1].ts).slice(0, 12).map(([k,v])=> v);
}
function updDataStamp(){
  const el = $('#updAt'); if(!el || !dataT) return;
  const m = Math.round((Date.now() - dataT) / 60000);
  el.textContent = 'Catalog updated ' + (m < 1 ? 'just now' : m === 1 ? '1m ago' : m + 'm ago');
}
setInterval(updDataStamp, 30000);
async function renderHome(){
  setActiveNav('home');
  view.innerHTML = `
    <div id="heroWrap"><div class="sk" style="height:min(88vh,820px);min-height:480px" role="status"></div></div>
    <div id="homeRows">
      <div class="native-slot"></div>
      <div class="svc-row" data-stagger aria-label="Browse by service">
        ${SERVICES.map(s => `<button class="svc" data-svc="${s.pid}" data-name="${esc(s.name)}" aria-label="Browse ${esc(s.name)}">
          <span class="mono" style="background:${esc(s.color)}22;color:${esc(s.color)};border:1px solid ${esc(s.color)}44">${esc(s.ab)}</span>
          <span class="nm"><b>${esc(s.name)}</b><span>BROWSE</span></span>
        </button>`).join('')}
      </div>
      <div id="localRows"></div>
    </div>
    <footer class="home-foot">
      <a href="#/reminders">Reminders</a><a href="#/sports">Sports</a><a href="#/dmca">DMCA</a>
      <button class="linklike js-set">Settings</button>
      ${CFG.DISCORD_URL ? `<a href="${esc(CFG.DISCORD_URL)}" target="_blank" rel="noopener">Discord</a>` : ''}
      <span id="updAt"></span><span>v${VERSION}</span><span>© ${new Date().getFullYear()} Zineby</span>
    </footer>`;
  staggerIn();
  wireDragScroll($('.svc-row'));
  $('.svc-row').addEventListener('click', e=>{
    const b = e.target.closest('[data-svc]');
    if(b) go(`/service/${b.dataset.svc}/${encodeURIComponent(b.dataset.name)}`);
  });
  if(adsEnabled()) mountNativeBanners();
  const local = $('#localRows');
  const r1 = rowHTML('cont', 'Continue watching', continueList(), { cw:true });
  const r2 = rowHTML('list', 'My List', getList(), { href:'#/mylist' });
  if(r1){ local.insertAdjacentHTML('beforeend', r1); wireRow(local.lastElementChild); }
  if(r2){ local.insertAdjacentHTML('beforeend', r2); wireRow(local.lastElementChild); }
  try{
    const t = await apiFetch('/trending/all/day');
    const items = t.results.map(normalizeItem).filter(x => x.poster && x.backdrop);
    dataT = Date.now(); updDataStamp();
    buildHero(items.slice(0, 5));
    $('#homeRows').insertAdjacentHTML('afterbegin', rowHTML('top10', 'Top 10 today', items.slice(0, 10), { rank:true }));
    wireRow($('#homeRows').querySelector('[data-row="top10"]')?.parentElement || view);
    wireRow($('[data-row="top10"]')?.closest('.row') || view);
  }catch{
    $('#heroWrap').innerHTML = `<div class="hero" style="display:grid;place-items:center"><div class="err" style="margin:0 auto">That didn't load. <button class="btn sm" onclick="location.reload()">Retry</button></div></div>`;
  }
  (async ()=>{
    try{
      const all = await fetchAllSports();
      const live = all.filter(m => m.state === 'in');
      updLiveDots(live.length);
      const show = live.length ? live.slice(0, 12) : all.filter(m => m.state === 'pre').slice(0, 12);
      if(!show.length || !document.body.contains(view)) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = rowHTML('live', live.length ? 'Live now' : 'Games today', show, { matches:true, href:'#/sports' });
      $('#homeRows').insertAdjacentHTML('afterbegin', tmp.firstElementChild.outerHTML);
      const el = $('[data-row="live"]');
      if(el) wireRow(el.closest('.row'));
    }catch{}
  })();
  [['/movie/popular','Popular movies','#/movies'],['/movie/top_rated','Critically acclaimed','#/movies'],['/movie/upcoming','Coming soon','#/movies'],['/tv/popular','Popular TV','#/tv']]
  .forEach(([p, label, href])=>{
    const rid = p.replace(/\W/g,'');
    ROW_RETRY[rid] = async ()=>{
      const old = document.getElementById('row-' + rid);
      if(!old) return;
      try{
        const d = await apiFetch(p);
        const items = d.results.map(normalizeItem).filter(x=>x.poster);
        const tmp = document.createElement('div');
        tmp.innerHTML = rowHTML(rid, label, items, { href });
        old.replaceWith(tmp.firstElementChild);
        const sec = document.getElementById('row-' + rid)?.closest('.row') || view;
        wireRow(sec);
      }catch{}
    };
    (async ()=>{
      try{
        const d = await apiFetch(p);
        const items = d.results.map(normalizeItem).filter(x=>x.poster);
        if(!document.body.contains(view)) return;
        $('#homeRows').insertAdjacentHTML('beforeend', rowHTML(rid, label, items, { href }));
        const sec = document.getElementById('row-' + rid)?.closest('.row');
        if(sec) wireRow(sec);
      }catch{
        if(!document.body.contains(view)) return;
        $('#homeRows').insertAdjacentHTML('beforeend', `<section class="row" id="row-${rid}"><div class="row-head"><h2>${esc(label)}</h2></div><div class="err">Couldn't load. <button class="btn sm" data-rowretry="${rid}">Retry</button></div></section>`);
      }
    })();
  });
}
function buildHero(items){
  if(!items.length) return;
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Late night pick' : hr < 12 ? 'Morning pick' : hr < 18 ? 'Afternoon pick' : 'Tonight\'s pick';
  $('#heroWrap').innerHTML = `<section class="hero" id="hero">
    <div class="hero-bg">${items.map((x,i)=>`<img src="${esc(img(x.backdrop,'w1280'))}" alt="" class="${i===0?'on':''}" ${i===0?'fetchpriority="high"':'loading="lazy"'} decoding="async">`).join('')}</div>
    <div class="hero-fade"></div>
    <div class="hero-inner">
      <div class="hero-rank" data-stagger><span class="badge">${items[0].vote ? items[0].vote.toFixed(1) : '#' + (state0()+1)}</span><span>${esc(greet)}</span></div>
      <h1 class="hero-title hx" data-stagger id="heroTitle"></h1>
      <p class="hero-meta hx" data-stagger id="heroMeta"></p>
      <p class="hero-over hx" id="heroOver"></p>
      <div class="hero-actions" data-stagger>
        <button class="btn primary" id="heroPlay"><svg viewBox="0 0 24 24" class="ic" style="fill:#fff;stroke:none"><path d="M8 5.5v13l11-6.5z"/></svg>Play</button>
        <button class="btn" id="heroInfo"><svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/></svg>More Info</button>
        <button class="btn" id="heroSave" aria-label="Save"></button>
      </div>
    </div>
    <div class="hero-dots" id="heroDots">${items.map((x,i)=>`<button aria-label="${esc(x.title)}" class="${i===0?'on':''}"></button>`).join('')}</div>
  </section>`;
  let idx = 0;
  function state0(){ return 0; }
  const show = n =>{
    idx = n;
    $$('#hero .hero-bg img').forEach((im,i)=> im.classList.toggle('on', i === n));
    $$('#heroDots button').forEach((d,i)=> d.classList.toggle('on', i === n));
    ['#heroTitle','#heroMeta','#heroOver'].forEach(s=> $(s).classList.add('fade'));
    setTimeout(()=>{
      const it = items[n], key = it.type + '/' + it.id;
      remember(it);
      $('#heroTitle').textContent = it.title;
      $('#heroMeta').innerHTML = `<span class="match"></span>${esc(it.year || '')}<span class="dot" style="width:4px;height:4px;border-radius:50%;background:var(--faint)"></span>${it.type === 'tv' ? 'TV' : 'Movie'}${it.vote ? `<span class="dot" style="width:4px;height:4px;border-radius:50%;background:var(--faint)"></span>★ ${it.vote.toFixed(1)}` : ''}`;
      $('#heroOver').textContent = it.overview || '';
      $('#heroSave').innerHTML = isSaved(key)
        ? '<svg viewBox="0 0 24 24" class="ic"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> My List'
        : '<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg> My List';
      $('#heroSave').dataset.save = key;
      $('#heroSave').setAttribute('aria-pressed', isSaved(key));
      $('#heroPlay').dataset.play = key;
      $('#heroInfo').dataset.more = key;
      ['#heroTitle','#heroMeta','#heroOver'].forEach(s=> $(s).classList.remove('fade'));
    }, reduceMotion ? 0 : 200);
  };
  show(0);
  staggerIn();
  const startRot = ()=>{ if(heroTimer === 0 && !reduceMotion) heroTimer = setInterval(()=> show((idx + 1) % items.length), 8000); };
  const stopRot = ()=>{ clearInterval(heroTimer); heroTimer = 0; };
  startRot();
  const hero = $('#hero');
  hero.addEventListener('mouseenter', stopRot);
  hero.addEventListener('mouseleave', startRot);
  hero.addEventListener('focusin', stopRot);
  hero.addEventListener('focusout', startRot);
  $$('#heroDots button').forEach((d,i)=> d.addEventListener('click', ()=>{ stopRot(); startRot(); show(i); }));
}

let sportsFilter = 'All', sportsData = null;
async function renderSports(){
  setActiveNav('sports');
  view.innerHTML = `<div class="container page" style="padding-top:84px">
    <h1 class="page-title" data-stagger>Live sports</h1>
    <div class="chips" data-stagger id="sportChips">
      ${['All',...LEAGUES.map(l=>l.short)].map(s=>`<button class="chip${s===sportsFilter?' on':''}" data-sf="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    <div id="sportsOut" style="margin-top:var(--s4)">
      <div class="grid-matches">${Array.from({length:8},()=>'<div class="sk" style="height:122px"></div>').join('')}</div>
    </div>
  </div>`;
  staggerIn();
  $('#sportChips').addEventListener('click', e=>{
    const b = e.target.closest('[data-sf]'); if(!b) return;
    sportsFilter = b.dataset.sf;
    $$('#sportChips .chip').forEach(x=>x.classList.toggle('on', x === b));
    paintSports();
  });
  try{ sportsData = await fetchAllSports(); }catch{ sportsData = []; }
  updLiveDots(sportsData.filter(m => m.state === 'in').length);
  paintSports();
}
function paintSports(){
  const out = $('#sportsOut'); if(!out) return;
  if(!sportsData){
    out.innerHTML = `<div class="err" style="margin:0 18px">Couldn't load scores — check your connection. <button class="btn sm" onclick="refreshRoute()">Retry</button></div>`;
    return;
  }
  let pool = sportsData;
  if(sportsFilter !== 'All'){
    const l = LEAGUES.find(x => x.short === sportsFilter);
    pool = l ? sportsData.filter(m => m.lkey === l.key) : [];
  }
  const live = pool.filter(m => m.state === 'in');
  const pre = pool.filter(m => m.state === 'pre').sort((a,b)=> new Date(a.date) - new Date(b.date));
  const post = pool.filter(m => m.state === 'post');
  let html = '';
  if(live.length) html += `<h2 class="subhead"><span class="live-dot" style="display:inline-block"></span>Live now</h2><div class="grid-matches">${live.slice(0,24).map(matchCardHTML).join('')}</div>`;
  if(pre.length) html += `<h2 class="subhead">Upcoming</h2><div class="grid-matches">${pre.slice(0,24).map(matchCardHTML).join('')}</div>`;
  if(post.length) html += `<h2 class="subhead">Finished</h2><div class="grid-matches">${post.slice(0,16).map(matchCardHTML).join('')}</div>`;
  out.innerHTML = html || `<div class="empty-state"><p>No games found for this filter right now. Try another league, or check back later.</p></div>`;
}

async function renderService(pid, name, page = 1){
  setActiveNav('');
  if(page === 1){
    view.innerHTML = `<div class="container page" style="padding-top:84px">
      <h1 class="page-title" data-stagger>On ${esc(name)}</h1>
      <div class="grid" id="svcOut">${Array.from({length:14},()=>`<div class="sk" style="aspect-ratio:2/3"></div>`).join('')}</div>
      <button class="btn" id="svcMore" style="margin:var(--s3) clamp(20px,5vw,72px) 0">Load more</button>
    </div>`;
    staggerIn();
    $('#svcMore').addEventListener('click', async e=>{
      const b = e.currentTarget; btnBusy(b, true);
      await renderService(pid, name, page + 1);
      btnBusy(b, false);
    });
  }
  try{
    const [m, t] = await Promise.all([
      apiFetch('/discover/movie', { with_watch_providers:pid, watch_region:'US', sort_by:'popularity.desc', page }),
      apiFetch('/discover/tv', { with_watch_providers:pid, watch_region:'US', sort_by:'popularity.desc', page })
    ]);
    const items = [...m.results, ...t.results].map(normalizeItem).filter(x=>x.poster);
    const out = $('#svcOut'); if(!out) return;
    if(page === 1) out.innerHTML = '';
    out.insertAdjacentHTML('beforeend', items.map(x=>cardHTML(x)).join(''));
    markLoaded(out);
  }catch{
    const out = $('#svcOut'); if(out && page === 1) out.innerHTML = `<div class="err">That didn't load. Try again later.</div>`;
  }
}

const GRID_TABS = { movie:[['popular','Popular'],['top_rated','Top rated'],['upcoming','Coming soon']],
                    tv:[['popular','Popular'],['top_rated','Top rated'],['on_the_air','On air']] };
async function renderGrid(type, kind='popular', page=1){
  setActiveNav(type === 'movie' ? 'movies' : 'tv');
  if(page === 1){
    view.innerHTML = `<div class="container page" style="padding-top:84px">
      <h1 class="page-title" data-stagger>${type === 'movie' ? 'Movies' : 'TV'}</h1>
      <div class="seg" data-stagger id="gridSeg" style="margin:0 clamp(20px,5vw,72px) var(--s4)">${GRID_TABS[type].map(([k,l])=>`<button data-kind="${k}" class="${k===kind?'on':''}">${l}</button>`).join('')}</div>
      <div class="grid" id="gridOut">${Array.from({length:14},()=>`<div class="sk" style="aspect-ratio:2/3"></div>`).join('')}</div>
      <button class="btn" id="loadMore" style="margin:var(--s3) clamp(20px,5vw,72px) 0">Load more</button>
    </div>`;
    staggerIn();
    $('#gridSeg').addEventListener('click', e=>{
      const b = e.target.closest('[data-kind]'); if(!b) return;
      $$('#gridSeg button').forEach(x=>x.classList.toggle('on', x === b));
      renderGrid(type, b.dataset.kind, 1);
    });
    $('#loadMore').addEventListener('click', async e=>{
      const b = e.currentTarget; btnBusy(b, true);
      await renderGrid(type, kind, page + 1);
      btnBusy(b, false);
    });
  }
  try{
    const d = await apiFetch(`/${type}/${kind}`, { page });
    const items = d.results.map(normalizeItem).filter(x=>x.poster);
    const out = $('#gridOut'); if(!out) return;
    if(page === 1) out.innerHTML = '';
    out.insertAdjacentHTML('beforeend', items.map(x=>cardHTML(x)).join(''));
    markLoaded(out);
  }catch{
    const out = $('#gridOut'); if(out) out.innerHTML = `<div class="err" style="margin:0 18px">That didn't load. Try again later.</div>`;
  }
}

function renderMyList(){
  setActiveNav('mylist');
  const items = getList();
  view.innerHTML = `<div class="container page" style="padding-top:84px">
    <h1 class="page-title" data-stagger>My List</h1>
    ${items.length ? `<div class="grid">${items.map(x=>cardHTML(x)).join('')}</div>`
      : `<div class="empty-state" data-stagger><p>Nothing saved yet. Tap + on any poster to keep it here.</p><a class="btn primary" href="#/movies">Browse movies</a></div>`}
  </div>`;
  staggerIn();
  markLoaded();
}

let searchTimer = 0;
function renderSearch(){
  setActiveNav('search');
  view.innerHTML = `<div class="container page" style="padding-top:84px">
    <h1 class="page-title" data-stagger>Search</h1>
    <div class="searchbar" data-stagger>
      <svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="searchInput" placeholder="Titles, people, genres…" autocomplete="off" aria-label="Search">
      <button class="ibtn sm" id="searchClear" hidden aria-label="Clear"><svg viewBox="0 0 24 24" class="ic" style="width:14px;height:14px"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <button class="ai-hint" id="aiHint" data-stagger><svg viewBox="0 0 24 24" class="ic"><path d="M12 3l1.9 5.6a2 2 0 0 0 1.5 1.5L21 12l-5.6 1.9a2 2 0 0 0-1.5 1.5L12 21l-1.9-5.6a2 2 0 0 0-1.5-1.5L3 12l5.6-1.9a2 2 0 0 0 1.5-1.5z"/><path d="M19 3v3M20.5 4.5h-3"/></svg><span>${isPremium() ? 'Not sure what to watch? Ask Zineby AI.' : 'Zineby AI is premium — sign in or enter a premium key.'}</span>›</button>
    <div id="searchOut" style="margin-top:var(--s4)"></div>
  </div>`;
  staggerIn();
  const inp = $('#searchInput'), clr = $('#searchClear'), out = $('#searchOut');
  if(finePointer) inp.focus();
  inp.addEventListener('input', ()=>{
    clr.hidden = !inp.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(()=> doSearch(inp.value.trim()), 300);
  });
  clr.addEventListener('click', ()=>{ inp.value = ''; clr.hidden = true; out.innerHTML = ''; inp.focus(); });
  $('#aiHint').addEventListener('click', ()=> openAi());
}
async function doSearch(q){
  const out = $('#searchOut'); if(!out) return;
  if(q.length < 2){ out.innerHTML = ''; return; }
  out.innerHTML = `<div class="grid">${Array.from({length:10},()=>`<div class="sk" style="aspect-ratio:2/3"></div>`).join('')}</div>`;
  try{
    const d = await apiFetch('/search/multi', { query:q, include_adult:'false' });
    const items = d.results.map(normalizeItem).filter(x => x.poster);
    out.innerHTML = items.length ? `<div class="grid">${items.map(x=>cardHTML(x)).join('')}</div>`
      : `<div class="empty-state"><p>No results for “${esc(q)}”.</p></div>`;
    markLoaded(out);
  }catch{ out.innerHTML = `<div class="err" style="margin:0 18px">Couldn't search right now.</div>`; }
}

async function renderDetail(type, id){
  setActiveNav('');
  view.innerHTML = `<div class="sk" style="height:min(64vh,620px);min-height:380px;border-radius:0" role="status"></div><div class="sk" style="height:38px;width:280px;margin:22px 18px 0"></div><div class="sk" style="height:15px;width:min(90%,580px);margin:15px 18px 0"></div>`;
  try{
    const d = await apiFetch(`/${type}/${id}`, { append_to_response:'videos,credits,recommendations' }, true);
    const it = Object.assign(normalizeItem(d), {
      overview:d.overview || '', runtime:d.runtime || (d.episode_run_time?.[0]) || 0,
      genres:(d.genres || []).map(g=>g.name), tagline:d.tagline || '',
      seasons:d.number_of_seasons || 0
    });
    it._seasonsRaw = d.seasons || [];
    const key = type + '/' + id;
    remember(it);
    const trailer = (d.videos?.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
    const recs = (d.recommendations?.results || []).map(normalizeItem).filter(x=>x.poster).slice(0,12);
    const pr = getProgress()[key];
    const hours = Math.floor((it.runtime || 0) / 60), mins = (it.runtime || 0) % 60;
    const playLabel = pr ? (pr.s ? `Resume S${pr.s} E${pr.e}` : `Resume · ${Math.round(pr.pct)}%`) : 'Play';
    view.innerHTML = `
      <div class="d-hero">
        ${it.backdrop ? `<img src="${esc(img(it.backdrop,'w1280'))}" alt="" fetchpriority="high" decoding="async">` : ''}
        <div class="d-scrim"></div>
        <div class="d-inner">
          <h1 class="d-title" data-stagger>${esc(it.title)}</h1>
          <p class="d-meta" data-stagger>${esc(it.year || '')}${it.year ? '<span class="dot"></span>' : ''}${type === 'tv' ? esc(it.seasons + (it.seasons === 1 ? ' season' : ' seasons')) : esc(hours ? `${hours}h ${mins}m` : '')}${it.vote ? `<span class="dot"></span>★ ${it.vote.toFixed(1)}` : ''}</p>
          <div class="d-actions" data-stagger>
            <button class="btn primary" data-play="${esc(key)}"><svg viewBox="0 0 24 24" class="ic" style="fill:#fff;stroke:none"><path d="M8 5.5v13l11-6.5z"/></svg>${esc(playLabel)}</button>
            ${trailer ? `<button class="btn" id="dTrailer">Trailer</button>` : ''}
            <button class="btn" data-save="${esc(key)}" aria-pressed="${isSaved(key)}">${isSaved(key) ? '✓ In My List' : '+ My List'}</button>
            <button class="btn" id="dRemind"><svg viewBox="0 0 24 24" class="ic"><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>Remind me</button>
          </div>
        </div>
      </div>
      <div style="margin:var(--s4) clamp(20px,5vw,72px) 0">
        <div class="d-body">
          <div><div class="d-poster">${it.poster ? `<img src="${esc(img(it.poster,'w342'))}" alt="${esc(it.title)} poster">` : `<span class="noart">${esc(it.title[0])}</span>`}</div></div>
          <div>
            ${it.tagline ? `<p style="color:var(--faint);font-size:13px;margin-bottom:9px;font-style:italic">${esc(it.tagline)}</p>` : ''}
            <p class="d-over">${esc(it.overview)}</p>
            ${it.genres.length ? `<div class="chips" style="padding:0;margin-top:15px">${it.genres.map(g=>`<span class="chip" style="pointer-events:none">${esc(g)}</span>`).join('')}</div>` : ''}
          </div>
        </div>
        ${(d.credits?.cast || []).length ? `<div class="d-sec"><h2 class="subhead" style="padding:0">Cast</h2><div class="cast-row" style="padding:0">${d.credits.cast.slice(0,14).map(c=>`
          <div class="cast"><div class="p">${c.profile_path ? `<img src="${esc(img(c.profile_path,'w185'))}" loading="lazy" alt="${esc(c.name)}">` : `<span class="noart">${esc(c.name[0])}</span>`}</div><b>${esc(c.name)}</b><span>${esc(c.character || '')}</span></div>`).join('')}</div></div>` : ''}
        ${type === 'tv' ? `<div class="d-sec"><h2 class="subhead" style="padding:0">Episodes</h2><select class="sel" id="seasonSel" aria-label="Season" style="margin-left:0">${Array.from({length:Math.max(it.seasons,1)},(_,i)=>`<option value="${i+1}">Season ${i+1}</option>`).join('')}</select><div class="ep-list" id="epList"><div class="sk" style="height:96px"></div></div></div>` : ''}
        ${recs.length ? `<div class="d-sec"><h2 class="subhead" style="padding:0">More like this</h2><div class="grid" style="padding:0">${recs.map(x=>cardHTML(x)).join('')}</div></div>` : ''}
      </div>`;
    markLoaded();
    if(trailer) $('#dTrailer').addEventListener('click', ()=> openTrailer(it.title, trailer.key));
    $('#dRemind').addEventListener('click', ()=> promptReminder(it.title, it.year || '', type === 'tv' ? 'Series' : 'Movie', key));
    if(type === 'tv'){
      const loadSeason = async n =>{
        $('#epList').innerHTML = `<div class="sk" style="height:96px"></div>`;
        try{
          const s = await apiFetch(`/tv/${id}/season/${n}`, {}, true);
          const cur = getProgress()[key];
          $('#epList').innerHTML = (s.episodes || []).map(ep=>`
            <div class="ep${cur?.s === n && cur?.e === ep.episode_number ? ' cur' : ''}" data-ep="${ep.episode_number}">
              <div class="still">${ep.still_path ? `<img src="${esc(img(ep.still_path,'w300'))}" loading="lazy" alt="">` : ''}<b>E${ep.episode_number}</b></div>
              <div><h4>${esc(ep.name || '')}<time>${esc((ep.air_date || '').slice(0,4))}</time></h4><p>${esc(ep.overview || '')}</p></div>
            </div>`).join('');
          $$('#epList .ep').forEach(el=> el.addEventListener('click', ()=> openPlayer(key, it, n, +el.dataset.ep)));
        }catch{ $('#epList').innerHTML = `<div class="err" style="margin:0">Episodes didn't load.</div>`; }
      };
      const initSeason = (pr?.s) || 1;
      $('#seasonSel').value = String(initSeason);
      $('#seasonSel').addEventListener('change', e=> loadSeason(+e.target.value));
      loadSeason(initSeason);
    }
  }catch{
    view.innerHTML = `<div style="padding:140px 18px"><div class="err" style="margin:0 auto;max-width:400px">That didn't load. <button class="btn sm" onclick="location.reload()">Retry</button></div></div>`;
  }
}

function remWhen(at){
  if(!at) return 'No date';
  const t = at - Date.now();
  if(t <= 0) return 'Passed';
  const m = Math.floor(t / 60000);
  if(m < 1) return 'Now';
  if(m < 60) return `in ${m}m`;
  if(m < 1440) return `in ${Math.floor(m/60)}h ${m%60}m`;
  if(m < 10080) return `in ${Math.floor(m/1440)}d`;
  return new Date(at).toLocaleDateString([], { month:'short', day:'numeric' });
}
function renderReminders(){
  setActiveNav('reminders');
  view.innerHTML = `<div class="container page" style="padding-top:84px">
    <div style="display:flex;align-items:center;gap:12px;margin:var(--s2) 0 var(--s3)">
      <h1 class="page-title" data-stagger style="margin:0;flex:1">Reminders</h1>
      <button class="btn primary" id="remAdd" style="margin-right:clamp(20px,5vw,72px)">+ New</button>
    </div>
    <p style="padding:0 clamp(20px,5vw,72px) var(--s4);margin:0;color:var(--dim);font-size:13px">Reminder days show as dots on the calendar (click the clock).</p>
    <div id="remList"></div>
  </div>`;
  staggerIn();
  paintReminders();
  remTick = setInterval(()=>{ if(ROUTE === '/reminders') paintReminders(); }, 30000);
  $('#remAdd').addEventListener('click', ()=> promptReminder('', '', '', null));
}
function paintReminders(){
  const list = $('#remList'); if(!list) return;
  const rs = [...getReminders()].sort((a,b)=>(a.at || Infinity) - (b.at || Infinity));
  if(!rs.length){
    list.innerHTML = `<div class="empty-state"><p>No reminders yet.</p><button class="btn" id="remAdd2" style="margin:0">New reminder</button></div>`;
    $('#remAdd2')?.addEventListener('click', ()=> promptReminder('', '', '', null));
    return;
  }
  list.innerHTML = rs.map(r => {
    const past = r.at && r.at <= Date.now();
    const d = r.at ? new Date(r.at) : null;
    return `<div class="rem">
      <span class="bell${past ? ' past' : ''}"><svg viewBox="0 0 24 24" class="ic"><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg></span>
      <div class="info"><b>${esc(r.title)}</b>${r.sub ? `<span>${esc(r.sub)}</span>` : ''}</div>
      <div class="when"><b style="${past ? 'color:var(--faint)' : ''}">${esc(remWhen(r.at))}</b>${d ? `<span style="font:500 11px var(--body);color:var(--faint)">${esc(d.toLocaleDateString([], { month:'short', day:'numeric' }))}</span>` : ''}</div>
      ${r.key ? `<a class="ibtn sm" href="#/detail/${esc(r.key)}" aria-label="Open">›</a>` : ''}
      <button class="ibtn sm" data-rm="${esc(r.id)}" aria-label="Delete"><svg viewBox="0 0 24 24" class="ic" style="width:15px;height:15px"><path d="M4.5 6.5h15M9.5 6V4.5h5V6M7 6.5l.8 13h8.4l.8-13"/></svg></button>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', ()=>{ delReminder(b.dataset.rm); paintReminders(); }));
}
function promptReminder(title, sub, kind, key){
  inputModal({
    title:'New reminder',
    body:`Reminder for ${title || 'anything you like'}. Leave the date blank for a dateless reminder.`,
    placeholder:'What is this reminder for?',
    withDate:true,
    onOk(v, when){
      addReminder({ title: v || title || 'Reminder', sub: [kind, sub].filter(Boolean).join(' · ') || null, at: when ? Date.parse(when) : null, key });
      if(ROUTE === '/reminders') paintReminders();
    }
  });
}

function renderDMCA(){
  setActiveNav('');
  view.innerHTML = `<div class="container page legal" data-stagger style="padding-top:84px">
    <h1>DMCA</h1>
    <p>Zineby does not host, upload, or store any video files. All media shown are displayed through third-party embedded services. Zineby does not verify the licensing of any third-party embed.</p>
    <h2>Filing a claim</h2>
    <p>Email <a href="mailto:${esc(CFG.CONTACT_EMAIL || '')}" id="dmcaMail"></a> and include: the work, the exact URL on Zineby, your contact info, a good-faith statement, and your authority to act.</p>
    <p>Valid claims are actioned within 72 hours.</p>
    <p class="fine">Zineby v${VERSION} · ${new Date().getFullYear()}</p>
  </div>`;
  $('#dmcaMail').textContent = String(CFG.CONTACT_EMAIL || '');
  staggerIn();
}

/* ═══ OVERLAYS ═══ */
let modalOpen = false, modalFocus = null;
function confirmModal({ title, body, word, onYes }){
  modalFocus = document.activeElement;
  modalOpen = true;
  $('#modalWrap').innerHTML = `<div class="modal-card glass-strong" role="dialog" aria-modal="true">
    <h3>${esc(title)}</h3><p>${esc(body)}</p>
    ${word ? `<label class="conf-word">Type <strong>${esc(word)}</strong> to confirm<input class="txt" id="confIn" autocomplete="off"></label>` : ''}
    <div class="modal-actions"><button class="btn" id="confNo">Cancel</button><button class="btn danger" id="confYes" ${word ? 'disabled' : ''}>Confirm</button></div>
  </div>`;
  $('#modalWrap').hidden = false;
  syncScrim(); updateLock();
  const inp = $('#confIn');
  if(inp){ inp.addEventListener('input', ()=>{ $('#confYes').disabled = inp.value !== word; }); inp.focus(); }
  $('#confNo').addEventListener('click', closeModal);
  $('#confYes').addEventListener('click', ()=>{ if(!$('#confYes').disabled){ const f = onYes; closeModal(); f && f(); } });
}
function inputModal({ title, body, placeholder, withDate, onOk }){
  modalFocus = document.activeElement;
  modalOpen = true;
  $('#modalWrap').innerHTML = `<div class="modal-card glass-strong" role="dialog" aria-modal="true">
    <h3>${esc(title)}</h3><p>${esc(body)}</p>
    <input class="txt" id="inpVal" placeholder="${esc(placeholder || '')}" autocomplete="off" style="margin-top:13px">
    ${withDate ? `<input class="txt" id="inpWhen" type="datetime-local" style="margin-top:9px" aria-label="Date and time">` : ''}
    <div class="modal-actions"><button class="btn" id="inpNo">Cancel</button><button class="btn primary" id="inpOk">${withDate ? 'Set reminder' : 'Unlock'}</button></div>
  </div>`;
  $('#modalWrap').hidden = false;
  syncScrim(); updateLock();
  $('#inpVal').focus();
  const ok = ()=>{
    const v = $('#inpVal').value;
    const when = withDate ? $('#inpWhen')?.value : '';
    closeModal();
    onOk(v, when);
  };
  $('#inpNo').addEventListener('click', closeModal);
  $('#inpOk').addEventListener('click', ok);
  $('#inpVal').addEventListener('keydown', e=>{ if(e.key === 'Enter' && !withDate) ok(); });
}
function closeModal(){
  modalOpen = false;
  $('#modalWrap').hidden = true;
  $('#modalWrap').innerHTML = '';
  syncScrim(); updateLock();
  modalFocus?.focus?.(); modalFocus = null;
}

const WHATSNEW = [
  'Netflix-grade redesign — edge-to-edge hero, hover-zoom cards, smart hiding nav.',
  'Phone, tablet and desktop each get their own layout automatically.',
  'Six themes, each with its own living background: embers, stars, bubbles, fireflies, aurora and gold dust.',
  'Ads dialed way back — one quiet slot on Home, popunder only on first click.'
];
function showWhatsNew(force){
  if(modalOpen || announceOpen) return;
  if(!force && store.get(K.seenVersion, '') === VERSION) return;
  modalOpen = true;
  $('#modalWrap').innerHTML = `<div class="modal-card glass-strong" role="dialog" aria-modal="true">
    <p class="ann-level"><span style="width:12px;height:2px;border-radius:2px;background:var(--accent)"></span>What's new<span class="ann-badge">v${VERSION}</span></p>
    <h3>Welcome to Zineby v${VERSION.split('.')[0]}</h3>
    <ul class="wn-list">${WHATSNEW.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="modal-actions"><button class="btn primary" id="wnOk">Got it</button></div>
  </div>`;
  $('#modalWrap').hidden = false;
  syncScrim(); updateLock();
  $('#wnOk').focus();
  $('#wnOk').addEventListener('click', ()=>{ store.set(K.seenVersion, VERSION); closeModal(); });
}

let drawerOpen = false, drawerFocus = null;
function openDrawer(tab){
  closeAccPop(); closePalette(); closeCal();
  drawerFocus = document.activeElement;
  drawerOpen = true;
  $('#drawer').classList.add('open');
  syncScrim(); updateLock();
  showTab(tab || 'appearance');
  syncSettingsUI();
  renderThemeGrid();
}
function closeDrawer(){
  if(!drawerOpen) return;
  drawerOpen = false;
  $('#drawer').classList.remove('open');
  syncScrim(); updateLock();
  drawerFocus?.focus?.(); drawerFocus = null;
}
 $('#drawerX').addEventListener('click', closeDrawer);
function showTab(name){
  $$('#drawer .tabs button').forEach(b=> b.classList.toggle('on', b.dataset.tab === name));
  ['appearance','playback','data'].forEach(t=> $('#tab-' + t).hidden = t !== name);
}
 $$('#drawer .tabs button').forEach(b=> b.addEventListener('click', ()=> showTab(b.dataset.tab)));
function syncSettingsUI(){
  const s = getSettings();
  $('#autoHideTog').checked = s.autoHide !== false;
  $('#clockTog').checked = s.clock;
  $('#h24Tog').checked = s.clock24;
  $('#probeTog').checked = s.probe;
  $('#panicTog').checked = s.panicKey;
  $('#closeConfTog').checked = s.closeConfirm && !isEmbedded();
  $('#ccSub').textContent = isEmbedded() ? 'Not available while embedded.' : 'Ask before leaving mid-playback.';
  $$('#defServer button').forEach(b=> b.classList.toggle('on', b.dataset.srv === s.source));
  $$('#navSeg button').forEach(b=> b.classList.toggle('on', b.dataset.navmode === (s.layout || 'auto')));
  syncAdsUI();
  $('#drawerFoot').textContent = `Zineby v${VERSION}`;
}
function adsUnlocked(){ return signedIn() || !!store.get(K.adsUnlock, false); }
function syncAdsUI(){
  $('#adsTog').checked = getSettings().adsOn;
  $('#adsSub').textContent = adsUnlocked() ? 'You can turn these off.' : 'Sign in, or enter the master key, to turn these off.';
}
[['autoHideTog','autoHide'],['clockTog','clock'],['h24Tog','clock24'],['probeTog','probe'],['panicTog','panicKey'],['closeConfTog','closeConfirm'],['autoNext','autoplayNext']]
  .forEach(([id, key])=> $('#'+id).addEventListener('change', e=>{
    setSettings({ [key]: e.target.checked });
    if(key === 'clock' || key === 'clock24') tickClock();
  }));
 $('#navSeg').addEventListener('click', e=>{
  const b = e.target.closest('[data-navmode]'); if(!b) return;
  setSettings({ layout: b.dataset.navmode });
  applyLayout();
});
 $('#defServer').addEventListener('click', e=>{
  const b = e.target.closest('[data-srv]'); if(!b) return;
  setSettings({ source:b.dataset.srv });
  $$('#defServer button').forEach(x=> x.classList.toggle('on', x === b));
});
 $('#adsTog').addEventListener('change', e=>{
  if(!adsUnlocked()){ e.target.checked = true; openKeyModal(); return; }
  setSettings({ adsOn: e.target.checked });
  toast(e.target.checked ? 'Ads on.' : 'Ads off.');
});
 $('#adsUnlock').addEventListener('click', openKeyModal);
function openKeyModal(){
  inputModal({
    title:'Ads master key',
    body:'Enter the owner-issued key to disable ads on this device.',
    placeholder:'Master key',
    onOk(v){
      let ok = false;
      try{ ok = CFG.ADS?.offKeyHash && (btoa(v.trim()) === CFG.ADS.offKeyHash); }catch{}
      if(ok){ store.set(K.adsUnlock, true); setSettings({ adsOn:false }); removeAds(); toast('Unlocked. Ads are off.'); }
      else toast('Wrong key.');
      syncAdsUI();
    }
  });
}
function renderThemeGrid(){
  const cur = getSettings().theme;
  $('#themeGrid').innerHTML = Object.entries(THEMES).map(([id, t]) => {
    const acc = hexToRgb(t.accent) || [225,29,46];
    return `<button class="theme-tile${cur === id ? ' on' : ''}" data-th="${esc(id)}" style="background:${t.sky},rgb(${t.bg.join(',')})" aria-label="${esc(t.name)}">
      <b>${esc(t.name)}</b>${cur === id ? `<span class="ck"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>` : ''}
    </button>`;
  }).join('');
}
 $('#themeGrid').addEventListener('click', e=>{
  const tile = e.target.closest('[data-th]');
  if(tile){
    if(document.startViewTransition && !reduceMotion) document.startViewTransition(()=>{ setSettings({ theme: tile.dataset.th }); applyTheme(); });
    else { setSettings({ theme: tile.dataset.th }); applyTheme(); }
    renderThemeGrid();
    toast(`Theme: ${THEMES[tile.dataset.th].name}`);
  }
});

/* premium + AI */
function isPremium(){
  if(store.get(K.premiumUnlock, false)) return true;
  if(!signedIn()) return false;
  const list = CFG.PREMIUM?.emails || [];
  if(list.includes('*')) return true;
  return list.includes((sess?.user?.email || '').toLowerCase());
}
function updatePremiumLocks(){
  const prem = isPremium();
  $$('.js-ai').forEach(b=>{
    let lk = b.querySelector('.lk');
    if(!prem && !lk){ lk = document.createElement('span'); lk.className = 'lk'; lk.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'; b.appendChild(lk); }
    if(prem && lk) lk.remove();
  });
}
 $$('.js-ai').forEach(b=>{ if(!b.querySelector('svg')) b.innerHTML = '<svg viewBox="0 0 24 24" class="ic"><path d="M12 3l1.9 5.6a2 2 0 0 0 1.5 1.5L21 12l-5.6 1.9a2 2 0 0 0-1.5 1.5L12 21l-1.9-5.6a2 2 0 0 0-1.5-1.5L3 12l5.6-1.9a2 2 0 0 0 1.5-1.5z"/><path d="M19 3v3M20.5 4.5h-3"/></svg>'; });
 $('#aiMark').innerHTML = markSVG();
const AI_SYS = 'You are Zineby AI, the film and TV guide inside the Zineby streaming app. You are warm, concise and opinionated, like a friend who has seen everything. Recommend specific titles. Keep replies under 100 words. Never mention being an AI model. If asked about anything other than movies or TV, gently steer back. After every reply, add this exact block:\nRECS:\nTitle — Year — movie\nTitle — Year — tv\n(up to 6 lines, em dashes exactly like shown).';
const AI_PROXY = CFG.AI?.proxy || '';
const AI_KEY = CFG.AI?.openaiKey || '';
const AI_MODEL = CFG.AI?.model || 'gpt-4o-mini';
let aiOpen = false, aiBusy = false, aiFocus = null;
const aiHistory = [];
function scrollAi(){ const m = $('#aiMsgs'); m.scrollTop = m.scrollHeight; }
function paintAiWelcome(){
  $('#aiMsgs').innerHTML = `<div class="ai-msg bot"><span class="txt">Tell me a mood, an actor, or a show you loved — I'll find something worth your night.</span></div>`;
  $('#aiChips').hidden = false;
  $('#aiChips').innerHTML = ['Like Interstellar','Feel-good comedy','A show to binge']
    .map(c => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join('');
}
 $('#aiChips').addEventListener('click', e=>{
  const b = e.target.closest('[data-chip]');
  if(!b) return;
  $('#aiInput').value = b.dataset.chip;
  aiSend();
});
function openAi(prefill){
  if(!isPremium()){
    toast('Zineby AI is premium. Sign in or enter a premium key.');
    openAccPop();
    return;
  }
  closeAccPop(); closePalette();
  aiFocus = document.activeElement;
  aiOpen = true;
  $('#aiWrap').hidden = false;
  syncScrim(); updateLock();
  if(!$('#aiMsgs').children.length) paintAiWelcome();
  $('#aiStatus').textContent = AI_PROXY ? 'Premium · relay' : AI_KEY ? 'Premium · direct' : 'Premium';
  scrollAi();
  if(prefill){ $('#aiInput').value = prefill; aiSend(); }
  else if(finePointer) $('#aiInput').focus();
}
function closeAi(){
  if(!aiOpen) return;
  aiOpen = false;
  $('#aiWrap').hidden = true;
  syncScrim(); updateLock();
  aiFocus?.focus?.(); aiFocus = null;
}
 $('#aiX').addEventListener('click', closeAi);
 $('#aiInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') aiSend(); });
 $('#aiSend').addEventListener('click', aiSend);
 $('#aiMsgs').addEventListener('click', e=>{ if(e.target.closest('[data-card],[data-play],[data-more]')) closeAi(); });
function aiTyping(on){
  const t = $('#aiTypingMsg');
  if(on && !t){
    const m = document.createElement('div');
    m.className = 'ai-msg bot'; m.id = 'aiTypingMsg';
    m.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span>';
    $('#aiMsgs').appendChild(m);
    scrollAi();
  } else if(!on && t){ t.remove(); }
}
function addAiMsg(role, text){
  const m = document.createElement('div');
  m.className = 'ai-msg ' + role;
  const span = document.createElement('span');
  span.className = 'txt';
  span.textContent = text;
  m.appendChild(span);
  $('#aiMsgs').appendChild(m);
  scrollAi();
  return m;
}
async function fillAiRecs(recs){
  const holder = addAiMsg('bot', '');
  holder.querySelector('.txt').remove();
  const label = document.createElement('p');
  label.className = 'ai-recs-label';
  label.textContent = 'Picks for you';
  holder.appendChild(label);
  const rc = document.createElement('div');
  rc.className = 'ai-recs';
  holder.appendChild(rc);
  rc.innerHTML = Array.from({ length: Math.min(recs.length, 4) }, () => '<div class="sk" style="width:116px;aspect-ratio:2/3"></div>').join('');
  scrollAi();
  const cards = await Promise.all(recs.map(lookupRec));
  if(!rc.isConnected) return;
  rc.innerHTML = '';
  let any = false;
  cards.forEach(c=>{ if(c){ any = true; rc.insertAdjacentHTML('beforeend', cardHTML(c)); } });
  markLoaded(rc);
  if(!any) holder.remove();
  scrollAi();
}
async function lookupRec(r){
  try{
    const d = await apiFetch('/search/multi', { query:r.title, include_adult:'false' });
    const cands = d.results.map(normalizeItem).filter(x => x.poster);
    if(!cands.length) return null;
    const tl = r.title.toLowerCase();
    const yr = r.year ? cands.find(x => x.year === r.year) : null;
    const typed = r.type ? cands.find(x => x.type === r.type) : null;
    const best = yr || cands.find(x => x.title.toLowerCase() === tl) || typed || cands[0];
    remember(best);
    return best;
  }catch{ return null; }
}
function splitRecs(text){
  const i = text.lastIndexOf('RECS:');
  if(i < 0) return { body: text.trim(), recs: [] };
  const body = text.slice(0, i).trim();
  const recs = [];
  text.slice(i + 5).split('\n').forEach(line=>{
    line = line.replace(/^[-*•\d.\s]+/, '').trim();
    if(!line) return;
    const title = line.split(/\s[—–|]\s|,/)[0].trim();
    const ym = line.match(/\b(19|20)\d{2}\b/);
    const isTv = /\btv\b|\bseries\b|\bshow\b/i.test(line);
    if(title && title.length < 80) recs.push({ title, year: ym ? ym[0] : '', type: isTv ? 'tv' : 'movie' });
  });
  return { body, recs: recs.slice(0, 6) };
}
async function aiCall(history){
  const msgs = [{ role:'system', content: AI_SYS }, ...history];
  if(AI_PROXY || AI_KEY){
    try{
      const headers = { 'Content-Type':'application/json' };
      let url = 'https://api.openai.com/v1/chat/completions';
      if(AI_PROXY) url = AI_PROXY;
      else headers.Authorization = 'Bearer ' + AI_KEY;
      const r = await fetch(url, { method:'POST', headers, body: JSON.stringify({ model: AI_MODEL, messages: msgs, temperature: .8, max_tokens: 400 }) });
      const j = await r.json().catch(()=> ({}));
      if(r.ok){
        const txt = j.choices?.[0]?.message?.content;
        if(txt) return String(txt);
      }
    }catch{}
  }
  const prompt = msgs.map(m => (m.role === 'system' ? '' : m.role === 'user' ? 'Viewer: ' : 'You: ') + m.content).join('\n').slice(-3500);
  const r2 = await fetch('https://text.pollinations.ai/' + encodeURIComponent(AI_SYS + '\n\n' + prompt));
  if(!r2.ok) throw new Error('ai http');
  const t2 = await r2.text();
  if(!t2) throw new Error('ai empty');
  return t2;
}
async function aiSend(){
  const inp = $('#aiInput');
  const q = inp.value.trim();
  if(!q || aiBusy) return;
  inp.value = '';
  $('#aiChips').hidden = true;
  addAiMsg('user', q);
  aiHistory.push({ role:'user', content:q });
  while(aiHistory.length > 12) aiHistory.shift();
  aiBusy = true;
  $('#aiSend').classList.add('busy');
  $('#aiStatus').textContent = 'Thinking…';
  aiTyping(true);
  try{
    const txt = await aiCall(aiHistory.slice(-9));
    aiTyping(false);
    const { body, recs } = splitRecs(txt);
    addAiMsg('bot', body || 'Here you go.');
    aiHistory.push({ role:'assistant', content: txt });
    while(aiHistory.length > 12) aiHistory.shift();
    if(recs.length) await fillAiRecs(recs);
  }catch{
    aiTyping(false);
    addAiMsg('bot', 'Zineby AI is offline right now. Try again in a bit.');
  }
  aiBusy = false;
  $('#aiSend').classList.remove('busy');
  $('#aiStatus').textContent = AI_PROXY ? 'Premium · relay' : AI_KEY ? 'Premium · direct' : 'Premium';
}

/* account + sync */
let sess = store.get(K.session, null);
const signedIn = () => !!(SB_READY && sess?.access_token);
let accOpen = false;
async function sb(path, { method='GET', body=null, auth=true, prefer } = {}){
  const h = { apikey: SB.anon, 'Content-Type':'application/json' };
  h.Authorization = 'Bearer ' + ((auth && sess?.access_token) || SB.anon);
  if(prefer) h.Prefer = prefer;
  const r = await fetch(SB.url.replace(/\/+$/,'') + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(()=> ({}));
  if(!r.ok){
    const err = new Error(j.error_description || j.msg || j.message || 'Request failed');
    err.status = r.status;
    throw err;
  }
  return j;
}
function saveSession(j){
  sess = { access_token:j.access_token, refresh_token:j.refresh_token, expires_at:Date.now() + (j.expires_in || 3600) * 1000,
           user:{ id:j.user?.id || null, email:j.user?.email || '' } };
  store.set(K.session, sess);
}
async function fillUser(){
  if(!sess?.user || sess.user.id) return;
  try{
    const u = await fetch(SB.url.replace(/\/+$/,'') + '/auth/v1/user', { headers:{ apikey:SB.anon, Authorization:'Bearer ' + sess.access_token } }).then(r=>r.json());
    if(u?.id){ sess.user = { id:u.id, email:u.email || '' }; store.set(K.session, sess); }
  }catch{}
}
async function ensureSession(){
  if(!SB_READY || !sess) return;
  if(sess.expires_at - Date.now() > 120000){ await fillUser(); return; }
  try{
    const j = await sb('/auth/v1/token?grant_type=refresh_token', { method:'POST', body:{ refresh_token:sess.refresh_token }, auth:false });
    saveSession(j);
  }catch{ sess = null; store.del(K.session); }
}
function parseHashAuth(){
  if(!location.hash?.includes('access_token') && !location.hash?.includes('error')) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const at = p.get('access_token'), rt = p.get('refresh_token');
  const errD = p.get('error_description') || p.get('error');
  try{ history.replaceState(null, '', location.pathname + location.search); }catch{}
  if(errD){ setTimeout(()=> toast('Sign-in failed. ' + String(errD).split('.')[0]), 300); return; }
  if(at && rt && SB_READY){
    sess = { access_token:at, refresh_token:rt, expires_at:Date.now() + (+p.get('expires_in') || 3600) * 1000, user:{ id:null, email:'' } };
    store.set(K.session, sess);
    fillUser().then(()=>{
      toast('Signed in as ' + (sess.user.email || 'your account'));
      updateAccountBtn();
      if(accOpen) renderAccPop();
      syncAdsUI();
      pullSync(false);
    });
    ROUTE = '/'; lastRendered = null;
  }
}
function authErrorMessage(e){
  if(e.status === 400) return 'Wrong email or password.';
  if(e.status === 422) return 'Enter a valid email and a password of at least 6 characters.';
  if(e.status === 429) return 'Too many attempts. Wait a bit and try again.';
  if(/already registered/i.test(e.message)) return 'That email already has an account.';
  return 'That didn\'t work. Check the details and try again.';
}
function updateAccountBtn(){
  $$('.js-acc').forEach(el=>{
    if(signedIn()){
      const mail = sess.user?.email || 'Account';
      el.innerHTML = `<span class="avatar" style="width:30px;height:30px;background:${avatarColor(mail)}">${esc(mail[0].toUpperCase())}</span>`;
      el.setAttribute('aria-label', 'Account — ' + mail);
    } else {
      el.innerHTML = '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/></svg>';
      el.setAttribute('aria-label', 'Sign in');
    }
  });
  updatePremiumLocks();
}
function accHTML(){
  const prem = isPremium();
  const setBtn = `<button class="btn" id="accSet"><svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.9l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>Settings</button>`;
  if(!SB_READY){
    return `<p class="acc-title">Account</p>
      <div class="acc-note">Accounts aren't configured on this site yet — the owner needs to add a Supabase URL and anon key (ideally via ENV_URL). Everything else works; your list stays on this device.</div>
      <div class="btn-col" style="margin-top:13px">${setBtn}${prem ? '' : `<button class="btn" id="premKeyBtn">Enter premium key</button>`}</div>`;
  }
  if(signedIn()){
    const mail = sess.user?.email || 'Account';
    return `<p class="acc-title">Account</p>
      <div class="acc-user">
        <span class="avatar" style="width:42px;height:42px;font-size:15px;background:${avatarColor(mail)}">${esc(mail[0].toUpperCase())}</span>
        <div style="min-width:0"><b title="${esc(mail)}">${esc(truncMid(mail, 24))}</b><small>${prem ? 'Premium · ' : ''}${esc(syncLabel())}</small></div>
      </div>
      <div class="btn-col">
        <button class="btn" id="pushBtn"><svg viewBox="0 0 24 24" class="ic"><path d="M20 8a8 8 0 0 0-14.5-2M4 4v4h4"/><path d="M4 16a8 8 0 0 0 14.5 2M20 20v-4h-4"/></svg>Sync now</button>
        <button class="btn" id="pullBtn"><svg viewBox="0 0 24 24" class="ic"><path d="M12 4v10M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19h14"/></svg>Pull from cloud</button>
        ${setBtn}
        ${prem ? '' : `<button class="btn" id="premKeyBtn">Enter premium key</button>`}
        <button class="btn" id="signOutBtn">Sign out</button>
      </div>`;
  }
  return `<p class="acc-title">Sign in</p>
    <div class="btn-col">
      <button class="btn" id="oaGoogle"><span style="font-weight:800;color:#4285F4">G</span>Continue with Google</button>
      <button class="btn" id="oaDiscord"><svg viewBox="0 0 24 24" class="ic" fill="currentColor" stroke="none" style="color:#5865F2"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.5 9-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l.8-1.4a13 13 0 0 1-2-.9l.4-.3a14.2 14.2 0 0 0 12.2 0l.4.3c-.6.4-1.3.7-2 .9l.8 1.4a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.4-13.7ZM8 15.3c-1.2 0-2.1-1.1-2.1-2.4S6.8 10.5 8 10.5s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z"/></svg>Continue with Discord</button>
    </div>
    <div class="or-rule"><span>or with email</span></div>
    <div class="acc-form">
      <label class="f-label" for="accEmail">Email</label>
      <input class="txt" id="accEmail" type="email" placeholder="you@example.com" autocomplete="email">
      <label class="f-label" for="accPass">Password</label>
      <span class="pw-wrap">
        <input class="txt" id="accPass" type="password" placeholder="6+ characters" autocomplete="current-password">
        <button class="pw-eye" id="pwEye" aria-label="Show password">👁</button>
      </span>
      <p class="acc-msg" id="accMsg" aria-live="polite"></p>
      <div class="row2">
        <button class="btn primary" id="btnSignIn">Sign in</button>
        <button class="btn" id="btnSignUp">Create account</button>
      </div>
    </div>
    <div class="or-rule"><span>or</span></div>
    <div class="btn-col">
      <button class="btn" id="premKeyBtn" style="width:100%">Enter premium key</button>
      ${setBtn}
    </div>`;
}
function wireAccPop(root){
  $('#oaGoogle', root)?.addEventListener('click', ()=> oauthSignIn('google'));
  $('#oaDiscord', root)?.addEventListener('click', ()=> oauthSignIn('discord'));
  $('#btnSignIn', root)?.addEventListener('click', ()=> doAuth('in'));
  $('#btnSignUp', root)?.addEventListener('click', ()=> doAuth('up'));
  $('#accPass', root)?.addEventListener('keydown', e=>{ if(e.key === 'Enter') doAuth('in'); });
  $('#pwEye', root)?.addEventListener('click', ()=>{
    const inp = $('#accPass', root);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#pwEye', root).textContent = show ? '🙈' : '👁';
  });
  $('#accSet', root)?.addEventListener('click', ()=>{ closeAccPop(); openDrawer(); });
  $('#pushBtn', root)?.addEventListener('click', async e=>{
    const b = e.currentTarget; btnBusy(b, true); await pushSync(true); btnBusy(b, false);
  });
  $('#pullBtn', root)?.addEventListener('click', async e=>{
    const b = e.currentTarget; btnBusy(b, true); await pullSync(true); btnBusy(b, false);
  });
  $('#signOutBtn', root)?.addEventListener('click', signOut);
  $('#premKeyBtn', root)?.addEventListener('click', openPremiumKeyModal);
}
function renderAccPop(){
  const pop = $('#accPop');
  pop.innerHTML = accHTML();
  wireAccPop(pop);
  syncAdsUI();
}
function openAccPop(){
  if(accOpen) return;
  closeDrawer(); closeCal();
  accOpen = true;
  renderAccPop();
  $('#accPop').hidden = false;
  $('#accCatch').hidden = false;
  updateLock();
}
function closeAccPop(){
  if(!accOpen) return;
  accOpen = false;
  $('#accPop').hidden = true;
  $('#accCatch').hidden = true;
  updateLock();
}
 $('#accCatch').addEventListener('click', closeAccPop);
function openPremiumKeyModal(){
  inputModal({
    title:'Premium key',
    body:'Enter the owner-issued premium key to unlock Zineby AI and ad-free browsing on this device.',
    placeholder:'Premium key',
    onOk(v){
      let ok = false;
      try{ ok = CFG.PREMIUM?.keyHash && (btoa(v.trim()) === CFG.PREMIUM.keyHash); }catch{}
      if(ok){ store.set(K.premiumUnlock, true); toast('Premium unlocked.'); }
      else toast('Wrong key.');
      updateAccountBtn();
      renderAccPop();
    }
  });
}
function oauthSignIn(provider){
  if(!SB_READY) return toast("Accounts aren't set up on this site.");
  if(isData()) return toast('Open the site on a real host to sign in.');
  const u = new URL(SB.url.replace(/\/+$/,'') + '/auth/v1/authorize');
  u.searchParams.set('provider', provider);
  try{ u.searchParams.set('redirect_to', location.href.split('#')[0]); }catch{}
  if(isEmbedded()){ try{ window.open(u.toString(), '_blank', 'noopener'); return; }catch{} }
  location.href = u.toString();
}
function setAccMsg(txt, bad){
  const m = $('#accMsg'); if(!m) return;
  m.textContent = txt || '';
  m.classList.toggle('bad', !!bad);
}
async function doAuth(mode){
  const email = $('#accEmail').value.trim();
  const pass = $('#accPass').value;
  if(!validEmail(email)){ $('#accEmail').classList.add('err'); return setAccMsg('Enter a valid email.', true); }
  if(pass.length < 6) return setAccMsg('Password must be at least 6 characters.', true);
  const btn = mode === 'in' ? $('#btnSignIn') : $('#btnSignUp');
  btnBusy(btn, true);
  setAccMsg(mode === 'in' ? 'Signing in…' : 'Creating account…');
  try{
    let j;
    if(mode === 'in'){
      j = await sb('/auth/v1/token?grant_type=password', { method:'POST', body:{ email, password:pass }, auth:false });
      saveSession(j);
    } else {
      j = await sb('/auth/v1/signup', { method:'POST', body:{ email, password:pass }, auth:false });
      if(j.access_token){ saveSession(j); }
      else {
        setAccMsg('Check your email to confirm the account, then sign in.');
        btnBusy(btn, false);
        return;
      }
    }
    toast('Signed in as ' + email);
    updateAccountBtn();
    renderAccPop();
    syncAdsUI();
    pullSync(false);
  }catch(e){
    setAccMsg(authErrorMessage(e), true);
  }
  btnBusy($('#btnSignIn'), false); btnBusy($('#btnSignUp'), false);
}
async function signOut(){
  try{ await sb('/auth/v1/logout', { method:'POST', body:{} }); }catch{}
  sess = null; store.del(K.session);
  toast('Signed out.');
  updateAccountBtn();
  renderAccPop();
}
function syncLabel(){
  const t = store.get(K.lastSync, 0);
  if(!t) return 'Never synced';
  const m = Math.round((Date.now() - t) / 60000);
  return 'Last synced ' + (m < 1 ? 'just now' : m < 60 ? m + 'm ago' : Math.round(m/60) + 'h ago');
}
function mergeRemote(remote){
  const lp = getProgress();
  for(const [k, v] of Object.entries(remote.progress || {})){
    if(!lp[k] || (v.ts || 0) > (lp[k].ts || 0)) lp[k] = v;
  }
  store.set(K.progress, lp);
  const map = new Map(getList().map(x=>[x.type + '/' + x.id, x]));
  (remote.watchlist || []).forEach(it=>{
    const k = it.type + '/' + it.id;
    const cur = map.get(k);
    if(!cur || (it.ts || 0) > (cur.ts || 0)) map.set(k, it);
  });
  store.set(K.list, [...map.values()].sort((a,b)=>(b.ts || 0) - (a.ts || 0)).slice(0, 100));
}
async function pushSync(manual){
  if(!SB_READY) return;
  if(!signedIn()){ if(manual) toast('Sign in first.'); return; }
  await ensureSession();
  if(!signedIn() || !sess.user?.id){ if(manual) toast('Still connecting. Try again.'); return; }
  try{
    await sb('/rest/v1/sync', { method:'POST', prefer:'resolution=merge-duplicates,return=minimal',
      body:[{ user_id:sess.user.id, data:{ watchlist:getList(), progress:getProgress() }, updated_at:new Date().toISOString() }] });
    store.set(K.lastSync, Date.now());
    if(accOpen) renderAccPop();
    if(manual) toast('Synced.');
  }catch{ if(manual) toast("Couldn't sync. Try again."); }
}
async function pullSync(manual){
  if(!SB_READY) return;
  if(!signedIn()){ if(manual) toast('Sign in first.'); return; }
  await ensureSession();
  if(!signedIn() || !sess.user?.id){ if(manual) toast('Still connecting. Try again.'); return; }
  try{
    const rows = await sb(`/rest/v1/sync?select=data&user_id=eq.${sess.user.id}`);
    if(rows?.[0]?.data) mergeRemote(rows[0].data);
    await pushSync(false);
    if(manual) toast('Pulled from cloud.');
    if(ROUTE === '/mylist' || ROUTE === '/'){ lastRendered = null; render(ROUTE); }
  }catch{ if(manual) toast("Couldn't pull. Try again."); }
}
let pushT = 0;
function queuePush(){
  if(!signedIn()) return;
  clearTimeout(pushT);
  pushT = setTimeout(()=> pushSync(false), 4000);
}

/* backup */
function backupPayload(){
  return { app:'zineby', version:VERSION, exported:new Date().toISOString(), settings:getSettings(),
           watchlist:getList(), progress:getProgress(), reminders:getReminders() };
}
 $('#dlBackup').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(backupPayload(), null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'zineby-backup.json';
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  toast('Backup downloaded.');
});
 $('#copyBackup').addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(JSON.stringify(backupPayload())); toast('Backup copied.'); }
  catch{ toast("Couldn't reach the clipboard."); }
});
 $('#importBackup').addEventListener('click', ()=> $('#importFile').click());
 $('#importFile').addEventListener('change', e=>{
  const f = e.target.files[0]; e.target.value = '';
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const j = JSON.parse(r.result);
      if(j.app !== 'zineby' && j.app !== 'zenby') throw 0;
      if(j.settings) store.set(K.settings, Object.assign({}, DEFAULTS, j.settings));
      if(j.watchlist) store.set(K.list, j.watchlist);
      if(j.progress) store.set(K.progress, j.progress);
      if(j.reminders) store.set(K.reminders, j.reminders);
      applyTheme(); applyLayout();
      toast('Backup imported.');
    }catch{ toast("That file isn't a Zineby backup."); }
  };
  r.readAsText(f);
});
 $('#clearHist').addEventListener('click', ()=> confirmModal({
  title:'Clear watch history', body:'Progress for everything you have watched will be deleted.', word:'CLEAR',
  onYes(){ store.del(K.progress); queuePush(); toast('History cleared.'); if(ROUTE === '/') refreshRoute(); }
}));
 $('#clearList').addEventListener('click', ()=> confirmModal({
  title:'Clear my list', body:'Everything saved to your list will be removed.', word:'CLEAR',
  onYes(){ store.del(K.list); queuePush(); toast('List cleared.'); if(ROUTE === '/mylist') refreshRoute(); }
}));
let resetArmed = 0;
 $('#resetAll').addEventListener('click', ()=>{
  const b = $('#resetAll');
  if(Date.now() - resetArmed > 3000){
    resetArmed = Date.now();
    b.textContent = 'Tap again to confirm';
    setTimeout(()=>{ if(Date.now() - resetArmed >= 2900) b.textContent = 'Reset everything'; }, 3100);
    return;
  }
  Object.values(K).forEach(k=> store.del(k));
  location.hash = '#/';
  location.reload();
});

/* palette */
let paletteOpen = false, palSel = 0, palItems = [], palTimer = 0, palFocus = null;
function paletteActions(){
  return [
    { label:'Zineby AI', hint:'premium', run:()=>{ closePalette(); openAi(); } },
    { label:'Random pick', run:randomPick },
    { label:'Movies', run:()=>go('/movies') },
    { label:'TV', run:()=>go('/tv') },
    { label:'Live sports', run:()=>go('/sports') },
    { label:'Reminders', run:()=>go('/reminders') },
    { label:'My List', run:()=>go('/mylist') },
    { label:'Search page', run:()=>go('/search') },
    { label:'Calendar', run:()=>{ closePalette(); openCal(); } },
    { label:'Settings', run:()=>{ closePalette(); openDrawer(); } },
    { label:'DMCA', run:()=>go('/dmca') }
  ];
}
function openPalette(){
  if(paletteOpen || DEVICE === 'phone') return;
  closeAccPop(); closeAi(); closeCal();
  palFocus = document.activeElement;
  paletteOpen = true; palSel = 0;
  $('#paletteWrap').hidden = false;
  syncScrim(); updateLock();
  $('#palInput').value = '';
  renderPalDefault();
  $('#palInput').focus();
}
function closePalette(){
  if(!paletteOpen) return;
  paletteOpen = false;
  $('#paletteWrap').hidden = true;
  syncScrim(); updateLock();
  palFocus?.focus?.(); palFocus = null;
}
 $('#palX').addEventListener('click', closePalette);
function renderPalDefault(){
  palItems = paletteActions().map(a=>({ kind:'act', ...a }));
  palSel = 0;
  paintPal('Actions');
}
function palLabel(){ return $('.pal-label')?.textContent || ''; }
function paintPal(label){
  $('#palList').innerHTML =
    (label ? `<p class="pal-label">${esc(label)}</p>` : '') +
    palItems.map((it,i)=> it.kind === 'act'
      ? `<button class="pal-item${i === palSel ? ' sel' : ''}" data-i="${i}"><span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`
      : `<button class="pal-item${i === palSel ? ' sel' : ''}" data-i="${i}"><img src="${esc(img(it.poster,'w92'))}" alt=""><span>${esc(it.title)}</span><small>${esc(it.year || '')} · ${it.type === 'tv' ? 'TV' : 'Movie'}</small></button>`
    ).join('');
}
 $('#palInput').addEventListener('input', e=>{
  clearTimeout(palTimer);
  const q = e.target.value.trim();
  palTimer = setTimeout(async ()=>{
    if(q.length < 2) return renderPalDefault();
    const acts = paletteActions().filter(a=> a.label.toLowerCase().includes(q.toLowerCase())).map(a=>({ kind:'act', ...a }));
    try{
      const d = await apiFetch('/search/multi', { query:q, include_adult:'false' });
      const res = d.results.map(normalizeItem).filter(x=>x.poster).slice(0, 8)
        .map(x=>{ remember(x); return { kind:'res', key:x.type + '/' + x.id, title:x.title, poster:x.poster, year:x.year, type:x.type }; });
      palItems = [...res, ...acts];
      palSel = 0;
      paintPal(res.length ? 'Results' : 'Actions');
    }catch{ palItems = acts; palSel = 0; paintPal('Actions'); }
  }, 300);
});
 $('#palInput').addEventListener('keydown', e=>{
  if(e.key === 'ArrowDown'){ e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); paintPal(palLabel()); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); palSel = Math.max(palSel - 1, 0); paintPal(palLabel()); }
  else if(e.key === 'Enter'){ e.preventDefault(); runPal(palSel); }
});
 $('#palList').addEventListener('click', e=>{
  const b = e.target.closest('[data-i]');
  if(b) runPal(+b.dataset.i);
});
function runPal(i){
  const it = palItems[i]; if(!it) return;
  if(it.kind === 'act'){ closePalette(); it.run(); }
  else { closePalette(); go('/detail/' + it.key); }
}
async function randomPick(){
  closePalette();
  try{
    const d = await apiFetch('/trending/all/day');
    const items = d.results.map(normalizeItem).filter(x=>x.poster);
    if(!items.length) return toast('Nothing to pick from right now.');
    const pick = items[Math.floor(Math.random() * items.length)];
    go('/detail/' + pick.type + '/' + pick.id);
  }catch{ toast("That didn't load. Try again."); }
}

/* announcements */
let announceOpen = false, annList = [];
async function pollAnnouncements(first){
  await envReady;
  const url = CFG.ANNOUNCEMENTS?.url;
  if(!url || !url.startsWith('https://')) return;
  try{
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
    if(!r.ok) return;
    const j = await r.json();
    annList = (j?.announcements || []).filter(a=>a?.id && a.title);
    if(first) setTimeout(showAnnouncements, 3000);
    else showAnnouncements();
  }catch{}
}
function showAnnouncements(){
  if(announceOpen || modalOpen){ setTimeout(showAnnouncements, 4000); return; }
  const dis = store.get(K.ann, []);
  const un = annList.filter(a => !dis.includes(a.id));
  if(!un.length) return;
  const a = un[0];
  announceOpen = true;
  $('#announceWrap').innerHTML = `<div class="modal-card glass-strong${a.level === 'important' ? ' ann-imp' : ''}" role="dialog" aria-modal="true">
    <p class="ann-level"><span style="width:12px;height:2px;border-radius:2px;background:var(--accent)"></span>Announcement</p>
    <h3 id="annTitle"></h3><p id="annBody"></p>
    <div class="modal-actions"><button class="btn primary" id="annOk">Got it</button></div>
  </div>`;
  $('#annTitle').textContent = String(a.title);
  $('#annBody').textContent = String(a.body || '');
  $('#announceWrap').hidden = false;
  syncScrim(); updateLock();
  $('#annOk').focus();
  $('#annOk').addEventListener('click', ()=>{
    dis.push(a.id);
    store.set(K.ann, dis.slice(-50));
    announceOpen = false;
    $('#announceWrap').hidden = true;
    $('#announceWrap').innerHTML = '';
    syncScrim(); updateLock();
  });
}

/* trailer */
let trailerOpen = false, trailerFocus = null;
function openTrailer(title, ytKey){
  trailerFocus = document.activeElement;
  trailerOpen = true;
  $('#trailerWrap').innerHTML = `<div class="trailer-box glass-strong" role="dialog" aria-modal="true">
    <div class="trailer-head"><b>${esc(title)} — Trailer</b><button class="ibtn sm" id="trX"><svg viewBox="0 0 24 24" class="ic" style="width:14px;height:14px"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="tr-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(ytKey)}?autoplay=1" title="${esc(title)} trailer" referrerpolicy="origin" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></div>
  </div>`;
  $('#trailerWrap').hidden = false;
  syncScrim(); updateLock();
  $('#trX').addEventListener('click', closeTrailer);
  $('#trailerWrap').addEventListener('click', e=>{ if(e.target === $('#trailerWrap')) closeTrailer(); });
  $('#trX').focus();
}
function closeTrailer(){
  trailerOpen = false;
  $('#trailerWrap').hidden = true;
  $('#trailerWrap').innerHTML = '';
  syncScrim(); updateLock();
  trailerFocus?.focus?.();
}

/* ═══ GLOBAL WIRING ═══ */
function updateLock(){
  const any = overlayOpen();
  document.body.classList.toggle('locked', any);
  if(any) topbar.classList.remove('nav-hidden');
}
function syncScrim(){
  const any = drawerOpen || modalOpen || paletteOpen || announceOpen || trailerOpen || aiOpen;
  $('#scrim').hidden = !any;
  $('#scrim').classList.toggle('on', any);
}
/* phone More sheet */
let moreOpen = false;
function openMore(){
  if(moreOpen) return closeMore();
  moreOpen = true;
  $('#moreSheet').hidden = false;
  $('#moreCatch').hidden = false;
}
function closeMore(){
  if(!moreOpen) return;
  moreOpen = false;
  $('#moreSheet').hidden = true;
  $('#moreCatch').hidden = true;
}
 $('#moreCatch').addEventListener('click', closeMore);
document.addEventListener('click', e=>{
  if(e.target.closest('[data-nav="more"]')){ e.preventDefault(); moreOpen ? closeMore() : openMore(); return; }
  if(e.target.closest('#moreSheet a, #moreSheet button:not([data-nav])')) closeMore();
  const rr = e.target.closest('[data-rowretry]');
  if(rr){ ROW_RETRY[rr.dataset.rowretry]?.(); return; }
  const sv = e.target.closest('[data-save]');
  if(sv){ toggleSave(sv.dataset.save); return; }
  const pl = e.target.closest('[data-play]');
  if(pl){ openPlayer(pl.dataset.play); return; }
  const mo = e.target.closest('[data-more]');
  if(mo){ go('/detail/' + mo.dataset.more); return; }
  const w = e.target.closest('.m-watch');
  if(w){ openSportPlayer({ home:w.dataset.home, away:w.dataset.away }); return; }
  const card = e.target.closest('[data-card]');
  if(card) go('/detail/' + card.dataset.card);
});
document.addEventListener('click', e=>{
  if(e.target.closest('.js-ai')){ aiOpen ? closeAi() : openAi(); return; }
  if(e.target.closest('.js-search')){ go('/search'); return; }
  if(e.target.closest('.js-dice')){ randomPick(); return; }
  if(e.target.closest('.js-set')){ drawerOpen ? closeDrawer() : openDrawer(); return; }
  if(e.target.closest('.js-acc')){ accOpen ? closeAccPop() : openAccPop(); return; }
  if(e.target.closest('.js-discord')){
    if(CFG.DISCORD_URL) window.open(CFG.DISCORD_URL, '_blank', 'noopener');
    else toast('Discord isn\'t linked yet — set DISCORD_URL in app.js.');
    return;
  }
});
document.addEventListener('click', e=>{
  const a = e.target.closest('a[href^="#/"]');
  if(!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go(a.getAttribute('href').slice(1));
  if(drawerOpen) closeDrawer();
  closeMore();
});
function maybeUnlock(){
  if(modalOpen) return closeModal();
  if(announceOpen){ announceOpen = false; $('#announceWrap').hidden = true; $('#announceWrap').innerHTML = ''; syncScrim(); updateLock(); return; }
  if(accOpen) return closeAccPop();
  if(aiOpen) return closeAi();
  if(paletteOpen) return closePalette();
  if(trailerOpen) return closeTrailer();
  if(calOpen) return closeCal();
  if(P.open && P.epOpen) return closeEpPanel();
  if(drawerOpen) return closeDrawer();
  if(P.open) return closePlayer();
  if(sportOpen) return closeSportPlayer();
}
document.addEventListener('keydown', e=>{
  const ae = document.activeElement;
  const typing = ae && (/^(input|textarea|select)$/i.test(ae.tagName) || ae.isContentEditable);
  if(e.key === 'Escape'){
    if(document.fullscreenElement) return;
    if(moreOpen) return closeMore();
    maybeUnlock();
    return;
  }
  if(DEVICE !== 'phone' && ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing))){
    e.preventDefault();
    paletteOpen ? closePalette() : openPalette();
    return;
  }
  if(DEVICE !== 'phone' && e.key === ',' && !typing && !overlayOpen()){
    e.preventDefault();
    drawerOpen ? closeDrawer() : openDrawer();
    return;
  }
  if(e.key.toLowerCase() === 'f' && P.open && !typing){
    e.preventDefault();
    toggleFull();
    return;
  }
  if((e.key === 'p' || e.key === 'P') && !typing && !e.ctrlKey && !e.metaKey && getSettings().panicKey) panic();
  if(P.open && !typing){
    if(e.key === 'ArrowLeft'){ P.elapsed = Math.max(0, P.elapsed - 10); paintSeek(); }
    if(e.key === 'ArrowRight'){ P.elapsed += 10; paintSeek(); }
  }
});
 $('#scrim').addEventListener('click', maybeUnlock);
document.addEventListener('keydown', e=>{
  if(e.key !== 'Tab') return;
  const root = drawerOpen ? $('#drawer') : paletteOpen ? $('#paletteWrap')
    : aiOpen ? $('#aiWrap')
    : modalOpen ? $('#modalWrap .modal-card') : announceOpen ? $('#announceWrap .modal-card')
    : accOpen ? $('#accPop') : trailerOpen ? $('#trailerWrap .trailer-box') : null;
  if(!root) return;
  const f = $$('button,[href],input,select,textarea', root).filter(x=>!x.disabled && x.offsetParent !== null);
  if(!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});
function panic(){ try{ window.top.location.replace('https://www.ixl.com'); }catch{ location.replace('https://www.ixl.com'); } }
document.addEventListener('dblclick', e=>{
  if(e.target.closest('button,a,input,select,textarea,label,[data-card],.row-scroll,.svc-row,.drawer,.modal-card,#paletteWrap,#accPop,#aiWrap,#player,#sportPlayer,#phonetabs,#moreSheet,#calPop')) return;
  if(getSettings().panicKey) panic();
});
let _lastTap = 0;
document.addEventListener('touchend', e=>{
  const n = Date.now();
  if(n - _lastTap < 320 && !e.target.closest('button,a,input,select,textarea,label,[data-card],.row-scroll,.svc-row,.drawer,.modal-card,#paletteWrap,#accPop,#aiWrap,#player,#sportPlayer,#phonetabs,#moreSheet,#calPop') && getSettings().panicKey) panic();
  _lastTap = n;
}, { passive:true });
(function(){
  let lastTap = 0;
  $('#player').addEventListener('touchend', e=>{
    if(e.target.closest('.pl-top,.pl-bottom,#epSheet,.pl-btn,.chip-btn,#plWake')) return;
    const now = Date.now();
    if(now - lastTap < 320){ toggleFull(); lastTap = 0; }
    else lastTap = now;
  }, { passive:true });
})();
addEventListener('online', ()=>{ updOnline(); toast('Back online.'); });
addEventListener('offline', updOnline);

/* ═══ BOOT ═══ */
 $('#brandMk').innerHTML = markSVG();
 $('#brandWm').innerHTML = wmSVG();
 $('#bootZ').innerHTML = markSVG();
 $('#aiMark').innerHTML = markSVG();
(function(){
  const s = getSettings();
  if(!THEMES[s.theme]) setSettings({ theme:'crimson' });
  if(!SERVERS.find(x => x.id === s.source)) setSettings({ source:'server1' });
})();
detectDevice();
applyTheme();
tickClock();
setInterval(tickClock, 30000);
updOnline();
updateAccountBtn();
parseHashAuth();
render(ROUTE);
envReady.then(()=>{
  if(adsEnabled()) mountNativeBanners();
});
(requestIdleCallback || setTimeout)(()=>{ pollAnnouncements(true); }, 900);
if(CFG.ANNOUNCEMENTS?.url) setInterval(pollAnnouncements, (CFG.ANNOUNCEMENTS.pollMinutes || 60) * 60000);
ensureSession().then(()=>{
  updateAccountBtn();
  if(accOpen) renderAccPop();
  if(signedIn()) pullSync(false);
});
setTimeout(()=> showWhatsNew(false), 1000);

/* ═══ README (in comments) ═══
DEPLOY (Vercel): drag the folder into vercel.com/new — vercel.json handles caching + SPA routing.

ENV ALL YOUR STUFF (3 min):
1. workers.cloudflare.com → Create Worker → paste:
   export default {
     async fetch(req) {
       return new Response(JSON.stringify({
         DATA_KEY: 'your-tmdb-key',
         SUPABASE: { url: 'https://xxxx.supabase.co', anon: 'eyJ...' },
         AI: { openaiKey: 'sk-...' },
         ANNOUNCEMENTS: { url: 'https://yourworker.workers.dev/announce', pollMinutes: 60 },
         DISCORD_URL: 'https://discord.gg/xxxx'
       }), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
     }
   };
2. Deploy → copy the URL into ENV_URL in app.js.
3. Now ALL secrets live on the worker. Change keys anytime without touching the site.
   For announcements, add a second route or key returning:
   { "announcements": [{ "id":"a1", "title":"...", "body":"...", "level":"important" }] }

SUPABASE (accounts + sync):
1. supabase.com → New project.
2. SQL Editor → run:
   create table sync (user_id uuid primary key references auth.users(id) on delete cascade,
     data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
   alter table sync enable row level security;
   create policy "own rows" on sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
3. Settings → API → copy Project URL + anon key → put them in the worker JSON (step above).
4. Google/Discord OAuth: enable the provider in Supabase Auth, redirect = https://xxxx.supabase.co/auth/v1/callback
*/
