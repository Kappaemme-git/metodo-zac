import { readFile } from 'node:fs/promises';
import { getRepository } from '../server/repository.mjs';
import { handleError, json, methodNotAllowed } from '../server/http.mjs';
import { sha256 } from '../server/security.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    try {
      const token = new URL(request.url).searchParams.get('token') || '';
      if (!/^[a-zA-Z0-9_-]{32,128}$/.test(token)) {
        return json({ ok: false, error: 'Link di download non valido.' }, 403);
      }
      const repository = getRepository();
      const tokenHash = sha256(token);
      const submission = await repository.findSubmissionByTokenHash(tokenHash);
      if (!submission) return json({ ok: false, error: 'Link di download non valido.' }, 403);
      const asset = await repository.resolveProgramDownload();
      if (!asset) return json({ ok: false, error: 'Il programma non è ancora disponibile.' }, 425);
      const consumed = await repository.consumeDownloadTokenHash(tokenHash);
      if (!consumed) return json({ ok: false, error: 'Questo link è già stato utilizzato.' }, 403);
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
