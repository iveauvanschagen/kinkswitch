// Wat speelt KINK? Now playing ophalen bij Triton en reclame of nieuws herkennen.
import { S } from '../state.js';
import { $ } from '../dom.js';
import { LOG } from '../log.js';
import { bgOn } from '../ui/settings.js';
import { renderFavBtns, showKink } from '../ui/tiles.js';
import { fmt, hhmm } from '../util.js';
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

// Korte omschrijving van wat KINK doorgaf, voor de log bij het begin van een blok
function kinkItems(items) {
  return items
    .map(
      it =>
        hhmm(it.start) +
        ' ' +
        (it.type === 'ad' ? 'reclame' : 'zonder titel') +
        (it.dur ? ' ' + fmt(it.dur / 1000) : '')
    )
    .join(', ');
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
            'Praten om ' + hhmm(it.start) + ' (' + fmt(it.dur / 1000) + '), geen reclametijd: KINK blijft'
          );
        }
      }
    }
    // Hetzelfde blok houdt dezelfde starttijd. KINK geeft maar een paar items terug, dus anders schuift die op.
    const prev = S.kinkNow;
    if (
      breakStart &&
      prev?.isBreak &&
      prev.breakStart < breakStart &&
      !items.some(it => it.type !== 'ad' && it.title && it.start >= prev.breakStart)
    )
      breakStart = prev.breakStart;
    // Log: één regel bij het begin van een blok, één bij het eind, en elk nieuw nummer. Losse reclames niet.
    if (breakStart) {
      if (!S.blockAds || S.blockAds.start !== breakStart) {
        S.blockAds = { start: breakStart, ads: new Set() };
        const upto = items.filter(it => it.start >= breakStart);
        LOG('kink', 'info', 'Reclameblok sinds ' + hhmm(breakStart) + ' (' + kinkItems(upto.reverse()) + ')');
      }
      items.forEach(it => {
        if (it.type === 'ad' && it.start >= breakStart && it.dur) S.blockAds.ads.add(it.start);
      });
    } else if (S.blockAds) {
      const n = S.blockAds.ads.size;
      LOG(
        'kink',
        'info',
        'Reclameblok voorbij na ' + fmt((last.start - S.blockAds.start) / 1000) + (n ? ', ' + n + ' reclames' : '')
      );
      S.blockAds = null;
    }
    if (!breakStart && last.title) {
      const sig = last.artist + '|' + last.title;
      if (sig !== S.lastKinkData) {
        S.lastKinkData = sig;
        LOG('kink', 'info', 'Nummer: ' + (last.artist ? last.artist + ' - ' : '') + last.title);
      }
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
