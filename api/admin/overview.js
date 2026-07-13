import { getRepository } from '../../server/repository.mjs';
import { handleError, json, methodNotAllowed, unauthorized } from '../../server/http.mjs';
import { hasAdminSession } from '../../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    if (!hasAdminSession(request)) return unauthorized();
    try {
      const url = new URL(request.url);
      const repository = getRepository();
      const [stats, leads] = await Promise.all([
        repository.stats(),
        repository.listLeads({
          search: url.searchParams.get('search'),
          status: url.searchParams.get('status'),
          level: url.searchParams.get('level'),
          limit: url.searchParams.get('limit'),
        }),
      ]);
      return json({ ok: true, stats, leads });
    } catch (error) {
      return handleError(error);
    }
  },
};
