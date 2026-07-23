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

    const pdf = Buffer.from('%PDF-1.4\n% test\n');
    const program = await repository.saveProgram(pdf, 'programma demo.pdf');
    assert.equal(program.active, true);
    assert.match(program.filename, /programma-demo\.pdf/);
    assert.deepEqual(await readFile(program.path), pdf);
    await repository.setProgramActive(false);
    assert.equal((await repository.getProgram()).active, false);
    const deleted = await repository.deleteProgram();
    assert.equal(deleted.active, false);
    assert.equal(deleted.filename, null);
    assert.equal(deleted.path, null);
    await assert.rejects(readFile(program.path), { code: 'ENOENT' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
