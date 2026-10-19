// De banner bovenaan: muziek, reclame of Must skip, met teller.
import { S } from '../state.js';
import { $, radio } from '../dom.js';
import { metaFresh } from '../kink/meta.js';
import { fmt } from '../util.js';

export function renderAd(now) {
  let cls = '',
    title,
    label,
    count = '';
  const fresh = metaFresh(now);
  // Na de Must skip begint reclame? Dan klopt "Reclame overgeslagen" weer.
  const skipping = S.autoAway && S.skipInfo && !(fresh && S.kinkNow.isBreak);
  if (skipping) {
    cls = 'away skip';
    title = S.skipInfo.pun;
    label = S.skipInfo.ear;
    count = fmt((now - S.autoAway) / 1000);
  } else if (S.autoAway) {
    cls = 'away';
    title = 'Reclame overgeslagen';
    label = 'Terug zodra KINK muziek draait';
    count = fmt((now - S.autoAway) / 1000);
  } else if (fresh && S.kinkNow.isBreak) {
    cls = 'now';
    title = 'Nu reclame of nieuws';
    label = !S.auto
      ? 'Automatisch wisselen staat uit'
      : S.mode === 'kink' && !radio.paused
        ? 'Wisselt zo naar Spotify'
        : 'Wisselt alleen als KINK speelt';
    count = fmt((now - S.kinkNow.breakStart) / 1000);
  } else if (fresh) {
    title = S.mode === 'spotify' ? 'Spotify speelt' : 'Muziek op KINK';
    label = S.auto ? 'Reclame of nieuws? Dan naar Spotify' : 'Automatisch wisselen staat uit';
  } else {
    cls = 'soon';
    title = 'Geen gegevens van KINK';
    label = 'Automatisch wisselen wacht op KINK';
  }
  $('banner').className = 'banner ' + cls;
  $('adTitle').textContent = title;
  $('adEyebrow').hidden = !skipping;
  $('nextLabel').textContent = label;
  $('countdown').textContent = count;
}
