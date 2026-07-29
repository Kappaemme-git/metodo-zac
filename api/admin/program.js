import { getRepository } from '../../server/repository.mjs';
import { handleError, json, methodNotAllowed, readJson, unauthorized } from '../../server/http.mjs';
import {
  createProgramUploadTicket,
  hasAdminSession,
  verifyProgramUploadTicket,
} from '../../server/security.mjs';
import { ValidationError } from '../../server/questionnaire.mjs';

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const LEGACY_PROXY_MAX_BYTES = 4 * 1024 * 1024;

export default {
  async fetch(request) {
    if (!hasAdminSession(request)) return unauthorized();
    try {
      const repository = getRepository();
      if (request.method === 'GET') {
        const program = await repository.getProgram();
        return json({ ok: true, program: publicProgram(program) });
      }
      if (request.method === 'POST') {
        const body = await readJson(request, 8 * 1024);
        const upload = validateUploadRequest(body);
        if (typeof repository.createProgramUpload !== 'function') {
          return json({ ok: true, upload: { mode: 'proxy' } });
        }
        const prepared = await repository.createProgramUpload(upload.filename);
        const ticket = createProgramUploadTicket({
          path: prepared.path,
          filename: prepared.filename,
          size: upload.size,
        });
        return json({
          ok: true,
          upload: {
            mode: prepared.mode,
            endpoint: prepared.endpoint,
            token: prepared.token,
            path: prepared.path,
            ticket,
          },
        });
      }
      if (request.method === 'PUT') {
        const contentType = request.headers.get('content-type') || '';
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (!contentType.includes('application/pdf')) throw new ValidationError('Seleziona un file PDF.');
        if (contentLength > LEGACY_PROXY_MAX_BYTES) throw new ValidationError('Usa il caricamento diretto per PDF oltre 4 MB.');
        const buffer = Buffer.from(await request.arrayBuffer());
        if (!buffer.length || buffer.length > LEGACY_PROXY_MAX_BYTES) throw new ValidationError('Usa il caricamento diretto per PDF oltre 4 MB.');
        if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ValidationError('Il file non sembra essere un PDF valido.');
        const filename = decodeURIComponent(request.headers.get('x-file-name') || 'programma-metodo-zac.pdf');
        const program = await repository.saveProgram(buffer, filename);
        return json({ ok: true, program: publicProgram(program), message: 'PDF caricato e pubblicato.' });
      }
      if (request.method === 'DELETE') {
        const program = await repository.deleteProgram();
        return json({ ok: true, program: publicProgram(program), message: 'PDF rimosso.' });
      }
      if (request.method === 'PATCH') {
        const body = await readJson(request, 4 * 1024);
        if (body.action === 'finalize-upload') {
          if (typeof repository.finalizeProgramUpload !== 'function') {
            throw new ValidationError('Caricamento diretto non disponibile in questo ambiente.');
          }
          const ticket = verifyProgramUploadTicket(body.ticket);
          if (!ticket) throw new ValidationError('Caricamento scaduto. Seleziona nuovamente il PDF.');
          const program = await repository.finalizeProgramUpload(ticket);
          return json({ ok: true, program: publicProgram(program), message: 'PDF caricato e pubblicato.' });
        }
        if (body.action === 'abort-upload') {
          if (typeof repository.abortProgramUpload !== 'function') {
            throw new ValidationError('Caricamento diretto non disponibile in questo ambiente.');
          }
          const ticket = verifyProgramUploadTicket(body.ticket);
          if (!ticket) throw new ValidationError('Caricamento scaduto.');
          await repository.abortProgramUpload(ticket);
          return json({ ok: true });
        }
        if (typeof body.active !== 'boolean') throw new ValidationError('Stato non valido.');
        const program = await repository.setProgramActive(body.active);
        return json({ ok: true, program: publicProgram(program) });
      }
      return methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
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

function validateUploadRequest(body) {
  const filename = String(body?.filename || '').trim();
  const size = Number(body?.size);
  const type = String(body?.type || '').toLowerCase();
  const acceptedTypes = new Set(['application/pdf', 'application/x-pdf', 'application/octet-stream']);
  if (!filename.toLowerCase().endsWith('.pdf') || filename.length > 180 || (type && !acceptedTypes.has(type))) {
    throw new ValidationError('Seleziona un file PDF.');
  }
  if (!Number.isInteger(size) || size < 5 || size > MAX_PDF_BYTES) {
    throw new ValidationError('Il PDF può pesare al massimo 50 MB.');
  }
  return { filename, size };
}
