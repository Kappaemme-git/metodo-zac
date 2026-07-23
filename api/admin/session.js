import { clearAdminSession, createAdminSession, hasAdminSession, verifyAdminPassword } from '../../server/security.mjs';
import { handleError, json, methodNotAllowed, readJson } from '../../server/http.mjs';

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') return json({ ok: true, authenticated: hasAdminSession(request) });
      if (request.method === 'POST') {
        const body = await readJson(request, 4 * 1024);
        if (!verifyAdminPassword(body.password)) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          return json({ ok: false, error: 'Credenziali non valide.' }, 401);
        }
        return json({ ok: true, authenticated: true }, 200, { 'set-cookie': createAdminSession(request) });
      }
      if (request.method === 'DELETE') {
        return json({ ok: true, authenticated: false }, 200, { 'set-cookie': clearAdminSession(request) });
      }
      return methodNotAllowed(['GET', 'POST', 'DELETE']);
    } catch (error) {
      return handleError(error);
    }
  },
};
