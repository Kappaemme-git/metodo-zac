import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProgramUploadTicket,
  hasCronAuthorization,
  verifyProgramUploadTicket,
} from '../server/security.mjs';

test('il keepalive accetta soltanto il segreto configurato per Vercel Cron', () => {
  process.env.CRON_SECRET = 'test-cron-secret-with-more-than-32-characters';
  try {
    assert.equal(hasCronAuthorization(new Request('http://localhost/api/keepalive')), false);
    assert.equal(hasCronAuthorization(new Request('http://localhost/api/keepalive', {
      headers: { authorization: 'Bearer wrong-secret' },
    })), false);
    assert.equal(hasCronAuthorization(new Request('http://localhost/api/keepalive', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })), true);
  } finally {
    delete process.env.CRON_SECRET;
  }
});

test('il ticket di upload PDF è firmato e non può essere modificato dal browser', () => {
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';
  try {
    const ticket = createProgramUploadTicket({
      path: 'programs/donna/123e4567-e89b-12d3-a456-426614174000/programma.pdf',
      filename: 'programma.pdf',
      size: 45 * 1024 * 1024,
      variant: 'donna',
    });
    assert.deepEqual(verifyProgramUploadTicket(ticket), {
      scope: 'program-upload',
      path: 'programs/donna/123e4567-e89b-12d3-a456-426614174000/programma.pdf',
      filename: 'programma.pdf',
      size: 45 * 1024 * 1024,
      variant: 'donna',
      exp: verifyProgramUploadTicket(ticket).exp,
    });
    const tampered = `${ticket.slice(0, -1)}${ticket.endsWith('a') ? 'b' : 'a'}`;
    assert.equal(verifyProgramUploadTicket(tampered), null);
  } finally {
    delete process.env.ADMIN_SESSION_SECRET;
  }
});
