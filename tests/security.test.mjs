import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProgramUploadTicket,
  verifyProgramUploadTicket,
} from '../server/security.mjs';

test('il ticket di upload PDF è firmato e non può essere modificato dal browser', () => {
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';
  try {
    const ticket = createProgramUploadTicket({
      path: 'programs/123e4567-e89b-12d3-a456-426614174000/programma.pdf',
      filename: 'programma.pdf',
      size: 45 * 1024 * 1024,
    });
    assert.deepEqual(verifyProgramUploadTicket(ticket), {
      scope: 'program-upload',
      path: 'programs/123e4567-e89b-12d3-a456-426614174000/programma.pdf',
      filename: 'programma.pdf',
      size: 45 * 1024 * 1024,
      exp: verifyProgramUploadTicket(ticket).exp,
    });
    const tampered = `${ticket.slice(0, -1)}${ticket.endsWith('a') ? 'b' : 'a'}`;
    assert.equal(verifyProgramUploadTicket(tampered), null);
  } finally {
    delete process.env.ADMIN_SESSION_SECRET;
  }
});
