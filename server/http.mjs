import { ValidationError } from './questionnaire.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { ...JSON_HEADERS, ...headers } });
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new ValidationError('Richiesta troppo grande.');
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new ValidationError('Richiesta troppo grande.');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new ValidationError('JSON non valido.');
  }
}

export function methodNotAllowed(allowed) {
  return json({ ok: false, error: 'Metodo non consentito.' }, 405, { allow: allowed.join(', ') });
}

export function unauthorized() {
  return json({ ok: false, error: 'Sessione non valida o scaduta.' }, 401);
}

export function handleError(error) {
  if (error instanceof ValidationError) {
    return json({ ok: false, error: error.message, field: error.field }, 400);
  }
  console.error('[zac-api]', error?.message || error);
  const configurationError = String(error?.message || '').startsWith('Configurazione mancante:');
  return json({
    ok: false,
    error: configurationError
      ? 'Il backend non è ancora configurato in questo ambiente.'
      : 'Si è verificato un errore. Riprova tra poco.',
  }, configurationError ? 503 : 500);
}

export function requestOrigin(request) {
  return request.headers.get('origin') || new URL(request.url).origin;
}
