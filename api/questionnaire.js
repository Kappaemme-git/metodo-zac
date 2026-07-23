import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed, readJson } from '../server/http.mjs';
import { validateQuestionnaire, ValidationError } from '../server/questionnaire.mjs';
import { downloadTokenFor, hashIp, sha256 } from '../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    try {
      const body = await readJson(request);
      const idempotencyKey = String(body.idempotencyKey || '');
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) {
        throw new ValidationError('Sessione del questionario non valida. Ricarica la pagina.');
      }
      const payload = validateQuestionnaire(body);
      const deliveryToken = downloadTokenFor(idempotencyKey);
      const repository = getRepository();
      const program = await repository.getProgram();
      const available = Boolean(program?.active && program?.path);
      if (!available) {
        return json({ ok: false, error: 'Il programma non è ancora disponibile.' }, 425);
      }
      const ipHash = hashIp(request);
      const existing = await repository.findSubmissionByIdempotencyKey(idempotencyKey);
      if (!existing && await repository.countRecent('questionnaire', ipHash, Date.now() - 60 * 60 * 1000) >= 5) {
        return json({ ok: false, error: 'Troppe compilazioni. Riprova tra un’ora.' }, 429);
      }
      const submission = existing || await repository.saveSubmission(
        payload,
        {
          idempotencyKey,
          deliveryTokenHash: sha256(deliveryToken),
          ipHash,
        },
      );
      return json({
        ok: true,
        result: {
          score: submission.score,
          level: submission.level,
          profile: submission.profile,
        },
        program: {
          available,
          downloadUrl: available ? `/api/program?token=${encodeURIComponent(deliveryToken)}` : null,
        },
      }, 201);
    } catch (error) {
      return handleError(error);
    }
  },
};
