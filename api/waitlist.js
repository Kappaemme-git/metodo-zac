import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed, readJson } from '../server/http.mjs';
import { validateWaitlist } from '../server/questionnaire.mjs';
import { hashIp } from '../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    try {
      const payload = validateWaitlist(await readJson(request));
      const repository = getRepository();
      const ipHash = hashIp(request);
      if (await repository.countRecent('waitlist', ipHash, Date.now() - 60 * 60 * 1000) >= 10) {
        return json({ ok: false, error: 'Troppe richieste. Riprova tra un’ora.' }, 429);
      }
      await repository.saveWaitlist(payload, { ipHash });
      return json({
        ok: true,
        message: 'Sei nella lista. Ti avviseremo quando il programma sarà disponibile.',
      }, 201);
    } catch (error) {
      return handleError(error);
    }
  },
};
