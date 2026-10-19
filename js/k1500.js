// KINK 1500: zoek de positie van een nummer in de lijst.
import { KINK1500 } from './data/kink1500.js';
import { norm } from './util.js';

// Titel zonder toevoegingen als "(Live)" of "- Remastered" en zonder "The" vooraan
function titleKey(t) {
  return norm((t || '').replace(/\s*[([].*?[)\]]/g, ' ').replace(/\s+-\s+.*$/, ''))
    .replace(/^the /, '');
}

// Artiest zonder "The" en zonder "and" of "&", zodat "The Cure" en "Cure" hetzelfde zijn
function artistKey(a) {
  return (
    ' ' +
    norm(a)
      .replace(/^the /, '')
      .replace(/\band\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() +
    ' '
  );
}

let index = null;

// Eén keer opbouwen: per titel de posities met hun artiest
function build() {
  index = new Map();
  KINK1500.trim()
    .split('\n')
    .forEach((line, i) => {
      const [artist, title] = line.split('|');
      const k = titleKey(title);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push({ pos: i + 1, a: artistKey(artist) });
    });
}

// Positie (1 tot en met 1500) of 0 als het nummer niet in de lijst staat
export function k1500Pos(artist, title) {
  if (!artist || !title) return 0;
  if (!index) build();
  const list = index.get(titleKey(title));
  if (!list) return 0;
  const a = artistKey(artist);
  // Artiest moet als geheel woord overeenkomen, in beide richtingen ("Iggy Pop" in "Iggy Pop & Kate Pierson")
  const hit = list.find(x => a.includes(x.a) || x.a.includes(a));
  return hit ? hit.pos : 0;
}
