import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sessionApi from '../api/admin/session.js';
import programAdminApi from '../api/admin/program.js';
import questionnaireApi from '../api/questionnaire.js';
import programApi from '../api/program.js';
import { resetRepositoryForTests } from '../server/repository.mjs';
import { PRIVACY_VERSION, QUESTIONNAIRE_VERSION } from '../server/questionnaire.mjs';

test('il questionario resta chiuso finché il PDF non è pubblicato', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zac-api-closed-'));
  process.env.ZAC_STORE_PATH = join(dir, 'store.json');
  process.env.DOWNLOAD_TOKEN_SECRET = 'test-download-secret-with-more-than-32-characters';
  process.env.IP_HASH_SECRET = 'test-ip-secret-with-more-than-32-characters';
  resetRepositoryForTests();
  try {
    const response = await questionnaireApi.fetch(new Request('http://localhost/api/questionnaire', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-closed-key-1234567890',
        questionnaireVersion: QUESTIONNAIRE_VERSION,
        privacyVersion: PRIVACY_VERSION,
        privacyAccepted: true,
        startedAt: Date.now() - 10_000,
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario@example.com',
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
      }),
    }));
    assert.equal(response.status, 425);
    assert.equal((await response.json()).error, 'Il programma non è ancora disponibile.');
  } finally {
    resetRepositoryForTests();
    delete process.env.ZAC_STORE_PATH;
    delete process.env.DOWNLOAD_TOKEN_SECRET;
    delete process.env.IP_HASH_SECRET;
    await rm(dir, { recursive: true, force: true });
  }
});

test('flusso completo: login, upload privato, questionario e download', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zac-api-'));
  process.env.ZAC_STORE_PATH = join(dir, 'store.json');
  process.env.ADMIN_PASSWORD = 'test-password';
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';
  process.env.DOWNLOAD_TOKEN_SECRET = 'test-download-secret-with-more-than-32-characters';
  process.env.IP_HASH_SECRET = 'test-ip-secret-with-more-than-32-characters';
  resetRepositoryForTests();
  try {
    const login = await sessionApi.fetch(new Request('http://localhost/api/admin/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }),
    }));
    assert.equal(login.status, 200);
    const adminCookie = login.headers.get('set-cookie').split(';')[0];

    const uploaded = await programAdminApi.fetch(new Request('http://localhost/api/admin/program', {
      method: 'PUT',
      headers: { cookie: adminCookie, 'content-type': 'application/pdf', 'x-file-name': encodeURIComponent('programma-test.pdf') },
      body: Buffer.from('%PDF-1.4\n% Metodo ZAC test\n'),
    }));
    assert.equal(uploaded.status, 200);

    const body = {
      idempotencyKey: 'test-session-key-1234567890', questionnaireVersion: QUESTIONNAIRE_VERSION,
      privacyVersion: PRIVACY_VERSION, privacyAccepted: true, marketingConsent: false,
      startedAt: Date.now() - 10_000, firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com',
      age: 33, gender: 'Uomo', improvementGoal: 'Aumentare massa e proporzioni.',
      motivation: 'Voglio allenarmi con un criterio finalmente misurabile.',
      answers: { obiettivo:'Aumentare massa muscolare',esperienza:'2 - 5 anni',frequenza:'3-4',alimentazione:'Sì',disciplina:'8',costanza:'Mai',consapevolezza:'Spesso',tecnica:'Buona',ostacolo:'Programmazione' },
    };
    const submitted = await questionnaireApi.fetch(new Request('http://localhost/api/questionnaire', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    assert.equal(submitted.status, 201);
    const result = await submitted.json();
    assert.equal(result.ok, true);
    assert.equal(result.program.available, true);
    assert.equal(result.program.downloadUrl, '/api/program');
    const downloadCookie = submitted.headers.get('set-cookie').split(';')[0];
    assert.match(downloadCookie, /^zac_download=/);

    const sharedLink = await programApi.fetch(new Request(`http://localhost${result.program.downloadUrl}`));
    assert.equal(sharedLink.status, 302);
    assert.equal(sharedLink.headers.get('location'), 'http://localhost/questionario.html');

    const downloaded = await programApi.fetch(new Request(`http://localhost${result.program.downloadUrl}`, {
      headers: { cookie: downloadCookie },
    }));
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get('content-type'), 'application/pdf');
    assert.match(Buffer.from(await downloaded.arrayBuffer()).toString(), /^%PDF-/);

    const deleted = await programAdminApi.fetch(new Request('http://localhost/api/admin/program', {
      method: 'DELETE',
      headers: { cookie: adminCookie },
    }));
    assert.equal(deleted.status, 200);
    assert.deepEqual((await deleted.json()).program, {
      active: false,
      filename: null,
      uploadedAt: null,
      ready: false,
    });

    const afterDelete = await programAdminApi.fetch(new Request('http://localhost/api/admin/program', {
      method: 'GET',
      headers: { cookie: adminCookie },
    }));
    assert.equal(afterDelete.status, 200);
    assert.equal((await afterDelete.json()).program.ready, false);
  } finally {
    resetRepositoryForTests();
    await rm(dir, { recursive: true, force: true });
  }
});
