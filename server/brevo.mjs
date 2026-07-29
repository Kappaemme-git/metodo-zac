const BREVO_API_URL = 'https://api.brevo.com/v3';

const DEFAULT_LIST_IDS = Object.freeze({
  Principiante: 3,
  Intermedio: 4,
  Avanzato: 5,
});

export class BrevoError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'BrevoError';
    this.status = status;
  }
}

function positiveInteger(value, fallback, name) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BrevoError(`Configurazione Brevo non valida: ${name}.`);
  }
  return parsed;
}

export function brevoListIds(env = process.env) {
  return {
    Principiante: positiveInteger(
      env.BREVO_LIST_PRINCIPIANTE_ID,
      DEFAULT_LIST_IDS.Principiante,
      'BREVO_LIST_PRINCIPIANTE_ID',
    ),
    Intermedio: positiveInteger(
      env.BREVO_LIST_INTERMEDIO_ID,
      DEFAULT_LIST_IDS.Intermedio,
      'BREVO_LIST_INTERMEDIO_ID',
    ),
    Avanzato: positiveInteger(
      env.BREVO_LIST_AVANZATO_ID,
      DEFAULT_LIST_IDS.Avanzato,
      'BREVO_LIST_AVANZATO_ID',
    ),
  };
}

async function brevoRequest(fetchImpl, apiKey, path, { method, body, signal }) {
  const response = await fetchImpl(`${BREVO_API_URL}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (response.ok || response.status === 404) return response;

  let remoteMessage = '';
  try {
    const payload = await response.json();
    remoteMessage = typeof payload?.message === 'string' ? ` ${payload.message}` : '';
  } catch {
    // Brevo può restituire una risposta senza JSON: lo status resta sufficiente.
  }
  throw new BrevoError(
    `Brevo non ha accettato il contatto (${response.status}).${remoteMessage}`,
    response.status,
  );
}

function contactAttributes(submission) {
  return {
    NOME: submission.firstName,
    COGNOME: submission.lastName,
    LIVELLO_ZAC: submission.level,
    PUNTEGGIO_ZAC: submission.score,
    OBIETTIVO_ZAC: submission.answers?.obiettivo || '',
  };
}

export async function syncQuestionnaireContact(submission, options = {}) {
  if (submission?.marketingConsent !== true) {
    return { status: 'skipped', reason: 'no-consent' };
  }

  const apiKey = String(options.apiKey ?? process.env.BREVO_API_KEY ?? '').trim();
  if (!apiKey) return { status: 'skipped', reason: 'not-configured' };

  const listIds = options.listIds || brevoListIds(options.env || process.env);
  const targetListId = listIds[submission.level];
  if (!targetListId) throw new BrevoError('Livello ZAC non valido per Brevo.');

  const otherListIds = Object.values(listIds).filter((id) => id !== targetListId);
  const attributes = contactAttributes(submission);
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 5_000;
  const signal = options.signal || AbortSignal.timeout(timeoutMs);

  const updated = await brevoRequest(
    fetchImpl,
    apiKey,
    `/contacts/${encodeURIComponent(submission.email)}`,
    {
      method: 'PUT',
      body: {
        attributes,
        listIds: [targetListId],
        unlinkListIds: otherListIds,
      },
      signal,
    },
  );

  if (updated.status !== 404) {
    return { status: 'synced', operation: 'updated', listId: targetListId };
  }

  await brevoRequest(fetchImpl, apiKey, '/contacts', {
    method: 'POST',
    body: {
      email: submission.email,
      attributes,
      listIds: [targetListId],
      updateEnabled: true,
    },
    signal,
  });

  return { status: 'synced', operation: 'created', listId: targetListId };
}
