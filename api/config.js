import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed } from '../server/http.mjs';
import { publicQuestionnaireConfig } from '../server/questionnaire.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    try {
      const programs = await getRepository().getPrograms();
      return json({
        ok: true,
        ...publicQuestionnaireConfig(),
        programAvailable: Object.values(programs).some((program) => Boolean(program?.active && program?.path)),
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
