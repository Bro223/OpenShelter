/**
 * Dev-server proxy configuration (loaded by `npm start` via --proxy-config).
 *
 * WHY THIS IS .js AND NOT .json: `/account` is BOTH an Angular route and an API
 * path, and a JSON proxy config can only match on the URL path — it cannot
 * distinguish a browser navigation from an API call. Both failure modes were
 * hit for real:
 *
 *   key "/account/"  -> the SPA route never reaches the dev server, so a
 *                       DIRECT LOAD or hard refresh of /account renders the
 *                       backend's JSON ("Cannot DELETE /account" for the API
 *                       call in the opposite direction was the other symptom).
 *   key "/account"   -> the API call is reachable, but a browser navigation to
 *                       /account is proxied too and the user gets the 401 JSON
 *                       {"status":401,...,"path":"/account"} instead of the UI.
 *
 * The bypass below keys on WHAT THE REQUEST IS, not just where it points:
 *   - browser navigation (GET + an Accept that does not ask for JSON) -> the
 *     dev server serves index.html, and Angular's router takes over;
 *   - anything else (GET /account/me, DELETE /account, the contact-change
 *     subpaths) -> proxied to the backend as before.
 *
 * The sibling API prefixes keep their trailing slash and are unaffected. If you
 * add a new prefix that is ALSO a frontend route, give it the same treatment
 * and the same comment — do not "simplify" this back to a bare JSON key.
 */
const API_TARGET = 'http://localhost:8080';

const api = { target: API_TARGET, secure: false, changeOrigin: true };

/** A browser navigation asks for HTML; an XHR from HttpClient asks for JSON. */
function isBrowserNavigation(req) {
  const accept = req.headers.accept || '';
  return req.method === 'GET' && !accept.includes('application/json');
}

module.exports = {
  '/api': api,
  '/auth': api,
  '/account': { ...api, bypass: (req) => (isBrowserNavigation(req) ? '/index.html' : undefined) },
  '/verify/': api,
  '/admin/': api,
};
