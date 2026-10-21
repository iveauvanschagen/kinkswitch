// Rondleiding: legt stap voor stap uit wat alles op het scherm doet.
// Start vanzelf de eerste keer (na een welkomstkaart) en opnieuw via Instellingen. Sluiten kan altijd.
import { $ } from '../dom.js';
import { LOG } from '../log.js';
import { ls } from '../store.js';

// sel: wat oplicht. alt: als dat niet zichtbaar is (bijvoorbeeld het hartje zonder nummer). Geen sel: kaart in het midden.
const STEPS = [
  {
    title: 'Welkom bij KINK Switch',
    text: 'KINK zonder reclame, en Spotify als KINK even niks voor je heeft. Deze rondleiding laat in een minuutje alles zien.',
  },
  {
    sel: '#kinkMode',
    title: 'KINK live',
    text: 'Tik op de tegel om KINK te luisteren. Je ziet altijd wat er nu speelt.',
  },
  {
    sel: '#kinkFav',
    alt: '#kinkMode',
    title: 'Must hear',
    text: 'Tik op het hartje bij een band die je nooit wil missen. Draait KINK ze, dan gaat de app terug naar KINK. In Instellingen bij Artiesten zie en bewerk je je Must hear en Must skip.',
  },
  {
    sel: '#kinkAdd',
    alt: '#kinkMode',
    title: 'KINK Catch',
    text: 'Goed nummer op KINK? Tik hier en het komt in je eigen KINK Catch-playlist op Spotify.',
  },
  {
    sel: '#banner',
    title: 'Reclame? Weg ermee',
    text: 'Begint er reclame of nieuws, dan gaat de app vanzelf naar Spotify en daarna weer terug naar KINK. Draait KINK een Must skip-band, dan sla je die ook over.',
  },
  {
    sel: '#spotifyMode',
    title: 'Spotify',
    text: 'Je playlist, met het nummer dat klaarstaat. Een groene rand betekent dat Spotify klaar is. Rood betekent dat Spotify even niet bereikbaar is: tik dan op de tegel.',
  },
  {
    sel: '.controls',
    title: 'Bediening',
    text: 'Afspelen of pauzeren, Volgende (werkt ook met de knop op je stuur) en Auto om het automatisch wisselen aan of uit te zetten.',
  },
  {
    sel: '#plBtn',
    title: 'Playlist',
    text: 'Kies welke Spotify-playlist speelt. Onder Gemist op KINK zie je de laatste nummers van KINK en zet je ze in KINK Catch.',
  },
  {
    sel: '#silly',
    title: "Don't be silly",
    text: 'De paniekknop. Eén tik en Wodan Boys knalt door Spotify.',
  },
  {
    sel: '#openSettings',
    title: 'Instellingen',
    text: 'Spotify koppelen, je Must hear en Must skip, Spotify wakker houden, scherm aan en meer.',
  },
  {
    title: 'Klaar!',
    text: 'Veel luisterplezier. Deze rondleiding vind je altijd terug in Instellingen.',
  },
];

// Eenmalige tip als Spotify voor het eerst wegvalt
const SPOT_TIP = {
  sel: '#spotifyMode',
  title: 'Spotify is even weg',
  text: 'Spotify is in slaap gevallen, KINK speelt gewoon door. Tik op de Spotify-tegel: de app opent Spotify. Laat Spotify zo\'n 5 seconden openstaan en ga dan terug naar KINK Switch. Dan kan de app hem weer besturen.',
};

let steps = STEPS;
let step = -1;
let box = null;

function visible(sel) {
  const el = sel && document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? el : null;
}

function dots() {
  return steps.map((_, i) => '<i' + (i === step ? ' class="on"' : '') + '></i>').join('');
}

function render() {
  const s = steps[step];
  const el = visible(s.sel) || visible(s.alt);
  const single = steps.length === 1,
    first = step === 0 && !single,
    last = step === steps.length - 1;
  box.innerHTML =
    '<div class="tcatch"></div>' +
    (el ? '<div class="thole"></div>' : '<div class="tdim"></div>') +
    '<div class="tcard" role="dialog" aria-modal="true" aria-labelledby="tourTitle">' +
    '<button class="tx" aria-label="Rondleiding sluiten">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<div class="tst">' + (single ? 'TIP' : 'STAP ' + (step + 1) + ' VAN ' + steps.length) + '</div>' +
    '<h3 id="tourTitle"></h3><p></p>' +
    '<div class="trow"><div class="tdots">' + (single ? '' : dots()) + '</div>' +
    (single ? '' : first ? '<button class="tb" data-a="close">Later</button>' : '<button class="tb" data-a="prev">Vorige</button>') +
    '<button class="tb tp" data-a="next">' +
    (single ? 'Begrepen' : first ? 'Starten' : last ? 'Klaar' : 'Volgende') +
    '</button></div></div>';
  box.querySelector('h3').textContent = s.title;
  box.querySelector('p').textContent = s.text;
  box.querySelector('.tx').onclick = () => endTour('gesloten');
  box.querySelectorAll('.tb').forEach(b => {
    b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'close') endTour('later');
      else if (a === 'prev') go(step - 1);
      else if (last) endTour('klaar');
      else go(step + 1);
    };
  });
  place(el);
  box.querySelector('.tb.tp').focus();
}

// Gat rond het onderdeel en het kaartje ernaast, binnen het scherm
function place(el) {
  const card = box.querySelector('.tcard');
  const W = innerWidth,
    H = innerHeight;
  if (!el) {
    card.style.left = Math.max(16, (W - card.offsetWidth) / 2) + 'px';
    card.style.top = Math.max(16, (H - card.offsetHeight) / 2) + 'px';
    return;
  }
  const r = el.getBoundingClientRect(),
    pad = 6;
  const hole = box.querySelector('.thole');
  hole.style.left = r.left - pad + 'px';
  hole.style.top = r.top - pad + 'px';
  hole.style.width = r.width + pad * 2 + 'px';
  hole.style.height = r.height + pad * 2 + 'px';
  const cw = card.offsetWidth,
    ch = card.offsetHeight,
    gap = 16;
  let top, left;
  if (r.bottom + gap + ch <= H - 16) top = r.bottom + gap;
  else if (r.top - gap - ch >= 16) top = r.top - gap - ch;
  else {
    // Geen plek boven of onder: ernaast als dat past, anders onderin over het onderdeel heen
    top = r.top + r.height / 2 - ch / 2;
    if (r.left - gap - cw >= 16) left = r.left - gap - cw;
    else if (r.right + gap + cw <= W - 16) left = r.right + gap;
    else top = H - ch - 16;
  }
  if (left === undefined) left = r.left + r.width / 2 - cw / 2;
  card.style.left = Math.max(16, Math.min(W - cw - 16, left)) + 'px';
  card.style.top = Math.max(16, Math.min(H - ch - 16, top)) + 'px';
}

function go(i) {
  step = Math.max(0, Math.min(steps.length - 1, i));
  render();
}

function onKey(e) {
  if (!box) return;
  if (e.key === 'Escape') endTour('gesloten');
  else if (e.key === 'ArrowRight' && step < steps.length - 1) go(step + 1);
  else if (e.key === 'ArrowLeft' && step > 0) go(step - 1);
}

function onResize() {
  if (box) render();
}

function open() {
  if (!box) {
    box = document.createElement('div');
    box.id = 'tour';
    document.body.appendChild(box);
    addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
  }
}

export function startTour(at = 0) {
  steps = STEPS;
  open();
  ls('ks_tour', 'seen');
  LOG('app', 'info', 'Rondleiding gestart');
  go(at);
}

// Spotify valt voor het eerst weg terwijl hij wel gekoppeld is: één keer uitleggen wat je dan doet.
// Lukt het nu niet (app op de achtergrond, venster of rondleiding open), dan de volgende keer.
export function spotTip() {
  if (ls('ks_tipSpot') || box) return;
  if (document.visibilityState !== 'visible' || document.querySelector('.modal.show')) return;
  ls('ks_tipSpot', 'seen');
  steps = [SPOT_TIP];
  open();
  LOG('app', 'info', 'Tip getoond: Spotify is even weg');
  go(0);
}

export function endTour(why) {
  if (!box) return;
  if (steps === STEPS) LOG('app', 'info', 'Rondleiding ' + why + ' bij stap ' + (step + 1));
  box.remove();
  box = null;
  step = -1;
  removeEventListener('keydown', onKey);
  removeEventListener('resize', onResize);
}

export function tourOpen() {
  return !!box;
}

// Eerste keer: welkomstkaart, maar niet als er al een venster openstaat (bijvoorbeeld een gedeelde playlist)
export function firstTour() {
  if (ls('ks_tour')) return;
  setTimeout(() => {
    if (ls('ks_tour') || document.querySelector('.modal.show')) return;
    startTour(0);
  }, 1200);
}

export function bindTour() {
  $('startTour').onclick = () => {
    $('modal').classList.remove('show');
    startTour(1);
  };
}
