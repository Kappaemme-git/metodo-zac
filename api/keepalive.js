import { handleError, json, methodNotAllowed, unauthorized } from '../server/http.mjs';
import { getRepository } from '../server/repository.mjs';
import { hasCronAuthorization } from '../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    try {
      if (!hasCronAuthorization(request)) return unauthorized();
      await getRepository().keepAlive();
      return json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  },
};
