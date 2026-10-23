// De teksten onderin. Waar er meer zijn, wisselt de app af (nooit twee keer dezelfde achter elkaar).
import { pickOther } from './util.js';

export const T = {
  ad: [
    'Reclame? Zonde van je oren.',
    'Dag Albert Heijn, hallo Spotify.',
    'Reclame. Spotify, neem jij even over?',
    '1+1 gratis?? Nope, jij verdient muziek!',
  ],
  back: ['Reclame voorbij. KINK, we zijn er weer.', 'De kust is veilig. Terug naar KINK.'],
  backSkip: ['De kust is veilig. Terug naar KINK.'],
  ban: ['{band}? Nope.', '{band}? Vandaag even niet.', '{band}? Mooi niet.', '{band}? Hard no.'],
  skipped: ['Dit nummer wordt even overgeslagen.', 'Next! Zo terug bij KINK.'],
  sillyStart: [
    'Paniekknop ingedrukt. Blijf kalm.',
    'Noodprocedure gestart...',
    'Wodan Boys worden opgetrommeld...',
    'Glas ingeslagen. Hulp is onderweg.',
  ],
  sillyDone: [
    'Wodan Boys hebben het overgenomen.',
    "Crisis bezworen. Don't be silly!",
    'Rustig maar, de Wodan Boys zijn er.',
    'Paniek voorbij. Volume open.',
  ],
  mustHear: 'Volume omhoog! {song}',
  pause: 'Adem in.',
  resume: 'Adem uit.',
  hearAdded: '{band} staat op je Must hear. Vanaf nu nooit meer missen.',
  hearRemoved: '{band} van je Must hear. Was leuk zolang het duurde.',
  caught: 'Gevangen! In KINK Catch.',
  released: 'Losgelaten. Weg uit KINK Catch.',
  spotifyBack: 'Spotify is wakker. Wisselen kan weer.',
  start: 'Gitaar gestemd. Klaar om te gaan.',
  kinkFail: 'KINK hapert. Nog een tik op KINK?',
  spotifyFail: 'Spotify slaapt nog. Por hem wakker met een tik op de tegel.',
};

const last = {};

// Een tekst kiezen, met {band} en {song} ingevuld
export function say(key, vars = {}) {
  const v = T[key];
  let s = Array.isArray(v) ? (last[key] = pickOther(v, last[key])) : v;
  for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
