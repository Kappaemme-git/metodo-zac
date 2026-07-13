import { getRepository } from '../../server/repository.mjs';
import { handleError, json, methodNotAllowed, readJson, unauthorized } from '../../server/http.mjs';
import { hasAdminSession } from '../../server/security.mjs';
import { ValidationError } from '../../server/questionnaire.mjs';

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export default {
  async fetch(request) {
    if (!hasAdminSession(request)) return unauthorized();
    try {
      const repository = getRepository();
      if (request.method === 'GET') {
        const program = await repository.getProgram();
        return json({ ok: true, program: publicProgram(program) });
      }
      if (request.method === 'PUT') {
        const contentType = request.headers.get('content-type') || '';
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (!contentType.includes('application/pdf')) throw new ValidationError('Seleziona un file PDF.');
        if (contentLength > MAX_PDF_BYTES) throw new ValidationError('Il PDF deve pesare meno di 4 MB.');
        const buffer = Buffer.from(await request.arrayBuffer());
        if (!buffer.length || buffer.length > MAX_PDF_BYTES) throw new ValidationError('Il PDF deve pesare meno di 4 MB.');
        if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ValidationError('Il file non sembra essere un PDF valido.');
        const filename = decodeURIComponent(request.headers.get('x-file-name') || 'programma-metodo-zac.pdf');
        const program = await repository.saveProgram(buffer, filename);
        return json({ ok: true, program: publicProgram(program), message: 'PDF caricato e pubblicato.' });
      }
      if (request.method === 'PATCH') {
        const body = await readJson(request, 4 * 1024);
        if (typeof body.active !== 'boolean') throw new ValidationError('Stato non valido.');
        const program = await repository.setProgramActive(body.active);
        return json({ ok: true, program: publicProgram(program) });
      }
      return methodNotAllowed(['GET', 'PUT', 'PATCH']);
    } catch (error) {
      return handleError(error);
    }
  },
};

function publicProgram(program) {
  return {
    active: Boolean(program?.active),
    filename: program?.filename || null,
    uploadedAt: program?.uploadedAt || null,
    ready: Boolean(program?.path),
  };
}
