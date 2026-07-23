import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import questionnaireApi from '../api/questionnaire.js';
import { PRIVACY_VERSION, QUESTIONNAIRE_VERSION } from '../server/questionnaire.mjs';
import { getRepository, resetRepositoryForTests } from '../server/repository.mjs';

function validPayload(idempotencyKey, email) {
  return {
    idempotencyKey,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    privacyVersion: PRIVACY_VERSION,
    privacyAccepted: true,
    marketingConsent: false,
    startedAt: Date.now() - 10_000,
    firstName: 'Mario',
    lastName: 'Rossi',
    email,
    age: 33,
    gender: 'Uomo',
    improvementGoal: 'Aumentare massa e proporzioni.',
    motivation: 'Voglio allenarmi con un criterio finalmente misurabile.',
    answers: {
      obiettivo: 'Aumentare massa muscolare',
      esperienza: '2 - 5 anni',
      frequenza: '3-4',
      alimentazione: 'Sì',
      disciplina: '8',
      costanza: 'Mai',
      consapevolezza: 'Spesso',
      tecnica: 'Buona',
      ostacolo: 'Programmazione',
    },
  };
}

function submit(payload) {
  return questionnaireApi.fetch(new Request('http://localhost/api/questionnaire', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify(payload),
  }));
}

test('an idempotent retry remains successful after the hourly limit is reached', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zac-idempotency-'));
  process.env.ZAC_STORE_PATH = join(dir, 'store.json');
  process.env.DOWNLOAD_TOKEN_SECRET = 'test-download-secret-with-more-than-32-characters';
  process.env.IP_HASH_SECRET = 'test-ip-secret-with-more-than-32-characters';
  resetRepositoryForTests();

  try {
    await getRepository().saveProgram(
      Buffer.from('%PDF-1.4\n% Metodo ZAC test\n'),
      'programma-test.pdf',
    );
    const firstPayload = validPayload('retry-session-key-0001', 'mario-0@example.com');
    const firstResponse = await submit(firstPayload);
    assert.equal(firstResponse.status, 201);
    const firstResult = await firstResponse.json();

    for (let index = 1; index < 5; index += 1) {
      const response = await submit(validPayload(
        `retry-session-key-000${index + 1}`,
        `mario-${index}@example.com`,
      ));
      assert.equal(response.status, 201);
    }

    const retryResponse = await submit(firstPayload);
    const retryResult = await retryResponse.json();

    assert.equal(retryResponse.status, 201);
    assert.deepEqual(retryResult, firstResult);
  } finally {
    resetRepositoryForTests();
    delete process.env.ZAC_STORE_PATH;
    delete process.env.DOWNLOAD_TOKEN_SECRET;
    delete process.env.IP_HASH_SECRET;
    await rm(dir, { recursive: true, force: true });
  }
});
