import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileRepository } from '../server/repository.mjs';

test('archivio locale salva lead, idempotenza e stato programma', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zac-repo-'));
  const repository = new FileRepository(join(dir, 'store.json'));
  try {
    await repository.saveWaitlist({ name: 'Mario Rossi', email: 'mario@example.com', goal: 'Massa', marketingConsent: false, privacyVersion: 'v1', source: 'test', utm: {} }, { ipHash: 'hash' });
    const payload = {
      firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', age: 30, gender: 'Uomo',
      answers: { obiettivo: 'Massa' }, improvementGoal: 'Più massa', motivation: 'Obiettivo personale',
      score: 52, level: 'Intermedio', profile: { code: 'costruzione' }, questionnaireVersion: 'v1',
      privacyVersion: 'v1', marketingConsent: true, source: 'test', utm: {},
    };
    const first = await repository.saveSubmission(payload, { idempotencyKey: 'same-key', deliveryTokenHash: 'token-hash', ipHash: 'hash' });
    const second = await repository.saveSubmission(payload, { idempotencyKey: 'same-key', deliveryTokenHash: 'other', ipHash: 'hash' });
    assert.equal(first.id, second.id);
    const stats = await repository.stats();
    assert.equal(stats.contacts, 1);
    assert.equal(stats.submissions, 1);
    assert.equal(stats.byLevel.Intermedio, 1);
    assert.equal(await repository.keepAlive(), true);

    const pdf = Buffer.from('%PDF-1.4\n% uomo\n');
    const donnaPdf = Buffer.from('%PDF-1.4\n% donna\n');
    const program = await repository.saveProgram(pdf, 'programma uomo.pdf', 'uomo');
    const donnaProgram = await repository.saveProgram(donnaPdf, 'programma donna.pdf', 'donna');
    assert.equal(program.active, true);
    assert.equal(donnaProgram.active, true);
    assert.match(program.filename, /programma-uomo\.pdf/);
    assert.match(donnaProgram.filename, /programma-donna\.pdf/);
    assert.deepEqual(await readFile(program.path), pdf);
    assert.deepEqual(await readFile(donnaProgram.path), donnaPdf);
    await repository.setProgramActive(false);
    assert.equal((await repository.getProgram()).active, false);
    assert.equal((await repository.getProgram('donna')).active, true);
    const deleted = await repository.deleteProgram('donna');
    assert.equal(deleted.active, false);
    assert.equal(deleted.filename, null);
    assert.equal(deleted.path, null);
    await assert.rejects(readFile(donnaProgram.path), { code: 'ENOENT' });
    assert.deepEqual(await readFile(program.path), pdf);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
