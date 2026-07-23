import { readFile } from 'node:fs/promises';
import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed } from '../server/http.mjs';
import { downloadTokenFromRequest, sha256 } from '../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    try {
      const token = downloadTokenFromRequest(request);
      if (!token) return questionnaireRedirect(request);
      const repository = getRepository();
      const submission = await repository.findSubmissionByTokenHash(sha256(token));
      if (!submission) return questionnaireRedirect(request);
      const asset = await repository.resolveProgramDownload();
      if (!asset) return json({ ok: false, error: 'Il programma non è ancora disponibile.' }, 425);
      if (asset.kind === 'redirect') return Response.redirect(asset.url, 302);
      const file = await readFile(asset.path);
      const filename = String(asset.filename || 'programma-metodo-zac.pdf').replace(/["\r\n]/g, '');
      return new Response(file, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="${filename}"`,
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (error) {
      return handleError(error);
    }
  },
};

function questionnaireRedirect(request) {
  return Response.redirect(new URL('/questionario.html', request.url), 302);
}
