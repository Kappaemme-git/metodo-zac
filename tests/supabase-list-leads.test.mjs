import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseRepository } from '../server/repository.mjs';

function submission({ id, createdAt, score, level }) {
  return {
    id,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@example.com',
    age: 32,
    gender: 'Uomo',
    answers: { obiettivo: 'Aumentare massa muscolare' },
    improvementGoal: 'Migliorare la qualità muscolare.',
    motivation: 'Allenarmi con un criterio misurabile.',
    score,
    level,
    profile: { code: level.toLowerCase() },
    questionnaireVersion: 'v1',
    privacyVersion: 'v1',
    marketingConsent: false,
    source: 'questionario',
    utm: {},
    idempotencyKey: `key-${id}`,
    deliveryTokenHash: `token-${id}`,
    ipHash: 'ip-hash',
    consentAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

test('Supabase lead listing keeps the newest submission for a repeated email', async () => {
  const repository = new SupabaseRepository('http://127.0.0.1:54321', 'test-key');
  const newest = submission({
    id: 'newest',
    createdAt: '2026-07-14T12:00:00.000Z',
    score: 82,
    level: 'Avanzato',
  });
  const oldest = submission({
    id: 'oldest',
    createdAt: '2026-06-14T12:00:00.000Z',
    score: 45,
    level: 'Intermedio',
  });

  repository.rawData = async () => ({
    waitlist: [],
    submissions: [newest, oldest],
    program: null,
  });

  const leads = await repository.listLeads({});

  assert.equal(leads.length, 1);
  assert.equal(leads[0].id, newest.id);
  assert.equal(leads[0].score, newest.score);
  assert.equal(leads[0].level, newest.level);
});
