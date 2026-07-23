import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'zac_admin';
const DOWNLOAD_COOKIE = 'zac_download';

function secret(name, minimum = 32) {
  const value = process.env[name];
  if (!value || value.length < minimum) {
    if (process.env.NODE_ENV === 'production') throw new Error(`Configurazione mancante: ${name}`);
    return `local-only-${name.toLowerCase()}-change-before-production-2026`;
  }
  return value;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function hashIp(request) {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '';
  if (!raw) return null;
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', secret('IP_HASH_SECRET')).update(`${day}:${raw}`).digest('hex');
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(value) {
  return createHmac('sha256', secret('ADMIN_SESSION_SECRET')).update(value).digest('base64url');
}

function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  return Object.fromEntries(header.split(';').map((part) => {
    const [key, ...rest] = part.trim().split('=');
    return [key, rest.join('=')];
  }).filter(([key]) => key));
}

export function createAdminSession(request) {
  const payload = Buffer.from(JSON.stringify({
    scope: 'admin',
    exp: Date.now() + 8 * 60 * 60 * 1000,
  })).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? '; Secure' : ''}`;
}

export function clearAdminSession(request) {
  const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function createDownloadSession(request, token) {
  const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return `${DOWNLOAD_COOKIE}=${token}; Path=/api/program; HttpOnly; SameSite=Strict; Max-Age=7200${secure ? '; Secure' : ''}`;
}

export function downloadTokenFromRequest(request) {
  const token = parseCookies(request)[DOWNLOAD_COOKIE] || '';
  return /^[a-zA-Z0-9_-]{32,128}$/.test(token) ? token : null;
}

export function hasAdminSession(request) {
  try {
    const value = parseCookies(request)[SESSION_COOKIE];
    if (!value) return false;
    const [payload, signature] = value.split('.');
    if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.scope === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password) {
  return safeEqual(password || '', secret('ADMIN_PASSWORD', 8));
}

export function downloadTokenFor(idempotencyKey) {
  return createHmac('sha256', secret('DOWNLOAD_TOKEN_SECRET'))
    .update(`zac-download:${idempotencyKey}`)
    .digest('base64url');
}
