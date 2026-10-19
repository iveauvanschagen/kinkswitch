// Wat speelt KINK? Now playing ophalen bij Triton en reclame of nieuws herkennen.
import { S } from '../state.js';
import { $ } from '../dom.js';
import { LOG } from '../log.js';
import { bgOn } from '../ui/settings.js';
import { renderFavBtns, showKink } from '../ui/tiles.js';
import { fmt, hhmm, hms } from '../util.js';
import { AD_WINDOW_MIN, BREAK_MIN_MS, KINK_META_URL } from '../config.js';

export function metaFresh(now) {
  return S.kinkNow && now - S.kinkNow.at < 60000;
}

// Reclame en nieuws zendt KINK alleen uit rond het hele en halve uur (6 minuten ervoor tot 6 minuten erna)
export function inAdWindow(ts) {
  const m = new Date(ts).getMinutes();
  const w = AD_WINDOW_MIN;
  return m >= 60 - w || m <= w || (m >= 30 - w && m <= 30 + w);
}

// Zet wat KINK zelf doorgeeft in de log, maar alleen als er iets veranderd is
export function logKinkData(items) {
  const desc = items
    .slice(0, 4)
    .map(
      it =>
        hms(it.start) +
        ' ' +
        (it.type === 'ad' ? 'RECLAME' : it.title ? 'nummer' : 'zonder titel') +
        (it.dur ? ' ' + fmt(it.dur / 1000) : '') +
        (it.title ? ' "' + (it.artist ? it.artist + ' - ' : '') + it.title + '"' : '')
    )
    .join(' | ');
  if (desc === S.lastKinkData) return;
  S.lastKinkData = desc;
  LOG('kink', 'info', 'KINK-data: ' + desc);
}

export async function pollMeta() {
  if (document.visibilityState !== 'visible' && S.mode !== 'kink' && !bgOn()) return;
  try {
    const r = await fetch(KINK_META_URL + '&numberToFetch=8&_=' + Date.now(), { cache: 'no-store' });
    const x = new DOMParser().parseFromString(await r.text(), 'text/xml');
    const items = [...x.querySelectorAll('nowplaying-info')]
      .map(el => {
        const p = {};
        el.querySelectorAll('property').forEach(q => (p[q.getAttribute('name')] = q.textContent));
        return {
          type: el.getAttribute('type'),
          start: +p.cue_time_start || 0,
          dur: +p.cue_time_duration || 0,
          title: p.cue_title || '',
          artist: p.track_artist_name || '',
        };
      })
      .sort((a, b) => b.start - a.start);
    const last = items[0];
    if (!last) return;
    logKinkData(items);
    // Blokdetectie: loop terug vanaf het nieuwste item tot het laatste echte nummer.
    // Een reclamemarkering telt altijd. Een item zonder titel van 45 seconden of langer telt alleen
    // rond het hele en halve uur, want alleen dan zendt KINK reclame en nieuws uit. Daarbuiten is het de presentator.
    let breakStart = 0;
    for (const it of items) {
      if (it.type !== 'ad' && it.title) break;
      if (it.type === 'ad') breakStart = it.start;
      else if (it.dur >= BREAK_MIN_MS) {
        if (inAdWindow(it.start)) breakStart = it.start;
        else if (S.talkLogged !== it.start) {
          S.talkLogged = it.start;
          LOG(
            'kink',
            'info',
            'Lang stuk zonder titel om ' +
              hms(it.start) +
              ' (' +
              fmt(it.dur / 1000) +
              '), buiten reclametijd: presentator, KINK blijft'
          );
        }
      }
    }
    const sig = last.type + '|' + (last.artist || '') + '|' + (last.title || '') + '|' + breakStart;
    if (sig !== (window.__lastSig || '')) {
      window.__lastSig = sig;
      LOG(
        'kink',
        'info',
        breakStart
          ? 'Blok (reclame/nieuws) sinds ' + hhmm(breakStart)
          : last.title
            ? 'Nummer: ' + (last.artist ? last.artist + ' - ' : '') + last.title
            : 'Jingle of presentator'
      );
    }
    S.kinkNow = { ...last, isBreak: !!breakStart, breakStart, at: Date.now() };
    S.metaFails = 0;
    showKink();
  } catch (e) {
    S.metaFails++;
    if (S.metaFails === 1 || S.metaFails % 20 === 0)
      LOG('kink', 'err', 'KINK-gegevens ophalen mislukt (' + S.metaFails + 'x): ' + e.message);
    if (S.metaFails === 1) {
      $('kinkArtist').textContent = 'Live radio';
      $('kinkSong').textContent = '';
      renderFavBtns();
    }
  }
}

// Slim kijken: KINK geeft de lengte van elk item mee. Rond het verwachte einde kijken we elke 3 seconden,
// tijdens een reclameblok elke 5 seconden en verder elke 15 seconden.
export function nextMetaWait() {
  if (!S.kinkNow) return 15000;
  if (S.kinkNow.isBreak || S.autoAway) return 2500; // tijdens een blok snel kijken, zodat terug naar KINK direct gaat
  if (S.kinkNow.dur) {
    const left = S.kinkNow.start + S.kinkNow.dur - Date.now();
    if (left > -60000 && left <= 4000) return 3000;
    if (left > 4000) return Math.max(3000, Math.min(15000, left - 2000));
  }
  return 15000;
}

export function metaDue() {
  if (S.metaBusy || Date.now() < S.nextMetaAt) return;
  S.metaBusy = true;
  pollMeta()
    .catch(() => {})
    .finally(() => {
      S.metaBusy = false;
      S.nextMetaAt = Date.now() + nextMetaWait();
    });
}
