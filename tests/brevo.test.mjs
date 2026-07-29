import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BrevoError,
  brevoListIds,
  syncQuestionnaireContact,
} from '../server/brevo.mjs';

function submission(overrides = {}) {
  return {
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@example.com',
    level: 'Intermedio',
    score: 58,
    answers: { obiettivo: 'Aumentare massa muscolare' },
    marketingConsent: true,
    ...overrides,
  };
}

test('Brevo non riceve chi non ha accettato il consenso marketing', async () => {
  let calls = 0;
  const result = await syncQuestionnaireContact(
    submission({ marketingConsent: false }),
    {
      apiKey: 'test-key',
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 204 });
      },
    },
  );

  assert.deepEqual(result, { status: 'skipped', reason: 'no-consent' });
  assert.equal(calls, 0);
});

test('Brevo aggiorna attributi e mantiene il contatto nella sola lista del livello', async () => {
  const calls = [];
  const result = await syncQuestionnaireContact(submission(), {
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(null, { status: 204 });
    },
  });

  assert.deepEqual(result, { status: 'synced', operation: 'updated', listId: 4 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/contacts/mario%40example.com');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(calls[0].options.headers['api-key'], 'test-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    attributes: {
      NOME: 'Mario',
      COGNOME: 'Rossi',
      LIVELLO_ZAC: 'Intermedio',
      PUNTEGGIO_ZAC: 58,
      OBIETTIVO_ZAC: 'Aumentare massa muscolare',
    },
    listIds: [4],
    unlinkListIds: [3, 5],
  });
});

test('Brevo crea il contatto quando non esiste ancora', async () => {
  const calls = [];
  const result = await syncQuestionnaireContact(
    submission({ level: 'Principiante', score: 21 }),
    {
      apiKey: 'test-key',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return calls.length === 1
          ? Response.json({ code: 'not_found' }, { status: 404 })
          : Response.json({ id: 123 }, { status: 201 });
      },
    },
  );

  assert.deepEqual(result, { status: 'synced', operation: 'created', listId: 3 });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.brevo.com/v3/contacts');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    email: 'mario@example.com',
    attributes: {
      NOME: 'Mario',
      COGNOME: 'Rossi',
      LIVELLO_ZAC: 'Principiante',
      PUNTEGGIO_ZAC: 21,
      OBIETTIVO_ZAC: 'Aumentare massa muscolare',
    },
    listIds: [3],
    updateEnabled: true,
  });
});

test('gli ID lista Brevo sono configurabili e validati', () => {
  assert.deepEqual(brevoListIds({}), {
    Principiante: 3,
    Intermedio: 4,
    Avanzato: 5,
  });
  assert.deepEqual(brevoListIds({
    BREVO_LIST_PRINCIPIANTE_ID: '13',
    BREVO_LIST_INTERMEDIO_ID: '14',
    BREVO_LIST_AVANZATO_ID: '15',
  }), {
    Principiante: 13,
    Intermedio: 14,
    Avanzato: 15,
  });
  assert.throws(
    () => brevoListIds({ BREVO_LIST_PRINCIPIANTE_ID: 'zero' }),
    BrevoError,
  );
});

test('un rifiuto di Brevo produce un errore privo della chiave API', async () => {
  await assert.rejects(
    () => syncQuestionnaireContact(submission(), {
      apiKey: 'secret-key-that-must-not-appear',
      fetchImpl: async () => Response.json(
        { message: 'Attributo non valido' },
        { status: 400 },
      ),
    }),
    (error) => {
      assert.equal(error.status, 400);
      assert.match(error.message, /Attributo non valido/);
      assert.doesNotMatch(error.message, /secret-key-that-must-not-appear/);
      return true;
    },
  );
});
