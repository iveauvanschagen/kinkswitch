// Aanroepen naar de Spotify Web API, met logging en duidelijke foutmeldingen.
import { S } from '../state.js';
import { LOG } from '../log.js';
import { getToken } from './auth.js';
import { ls } from '../store.js';

export const aborted = e => /^Afgebroken/.test((e && e.message) || '');

export async function api(path, method = 'GET', body, retried, quiet403) {
  const t0 = Date.now();
  const t = await getToken();
  let r;
  try {
    r = await fetch('https://api.spotify.com/v1' + path, {
      method,
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    LOG('api', 'err', method + ' ' + path.split('?')[0] + ' netwerkfout: ' + e.message);
    S.lastErr = { t: Date.now(), code: 'NET' };
    throw Error('Geen verbinding met Spotify.');
  }
  const ms = Date.now() - t0,
    p = path.replace(/access_token=[^&]+/, '');
  // Routine-uitlezen (wat speelt er, welke apparaten) niet loggen; commando's en fouten wel
  const routine = method === 'GET' && /^\/me\/player(\/devices)?(\?|$)/.test(p);
  if (r.status === 204 || r.status === 202) {
    if (!routine) LOG('api', 'ok', method + ' ' + p + ' ' + r.status + ' (' + ms + ' ms)');
    return null;
  }
  const txt = await r.text();
  let d = null;
  try {
    d = txt ? JSON.parse(txt) : null;
  } catch (e) {}
  if (!r.ok) {
    const reason = d?.error?.reason || '',
      m = d?.error?.message || '';
    if (quiet403 && r.status === 403) {
      LOG('api', 'info', method + ' ' + p + ' 403 (niets om te pauzeren)');
      throw Error('niets om te pauzeren');
    }
    LOG(
      'api',
      'err',
      method + ' ' + p + ' ' + r.status + ' (' + ms + ' ms) ' + m + (reason ? ' / ' + reason : '')
    );
    S.lastErr = { t: Date.now(), code: r.status + (reason ? ' ' + reason : '') };
    // Sleutel geweigerd terwijl hij nog geldig leek? Eén keer vernieuwen en opnieuw proberen.
    if (r.status === 401 && !retried) {
      S.token = null;
      ls('ks_expiry', '0');
      LOG('auth', 'warn', '401 ontvangen, sleutel wordt vernieuwd');
      return api(path, method, body, true, quiet403);
    }
    if (r.status === 404 && /device|player|active/i.test(m + ' ' + reason + ' ' + path))
      throw Error('Geen Spotify-apparaat gevonden. Open de Spotify-app op je telefoon en probeer opnieuw.');
    if (r.status === 403)
      throw Error('Spotify weigert (403' + (reason ? ' ' + reason : '') + '). ' + (m || ''));
    throw Error((m || 'Spotify fout') + ' (' + r.status + ')');
  }
  if (!routine) LOG('api', 'ok', method + ' ' + p + ' ' + r.status + ' (' + ms + ' ms)');
  return d;
}
