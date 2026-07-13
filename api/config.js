import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed } from '../server/http.mjs';
import { publicQuestionnaireConfig } from '../server/questionnaire.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    try {
      const program = await getRepository().getProgram();
      return json({
        ok: true,
        ...publicQuestionnaireConfig(),
        programAvailable: Boolean(program?.active && program?.path),
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
