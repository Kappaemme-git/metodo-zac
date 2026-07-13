import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EMPTY_STORE = {
  waitlist: [],
  submissions: [],
  program: {
    active: false,
    filename: null,
    path: null,
    uploadedAt: null,
    updatedAt: null,
  },
};

function isoNow() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function publicSubmission(row) {
  const { deliveryTokenHash, ipHash, ...safe } = row;
  return safe;
}

function computeStats(waitlist, submissions, program) {
  const today = Date.now();
  const recentCutoff = today - 7 * 24 * 60 * 60 * 1000;
  const byLevel = { Principiante: 0, Intermedio: 0, Avanzato: 0 };
  const goals = {};
  for (const item of submissions) {
    if (item.level in byLevel) byLevel[item.level] += 1;
    const goal = item.answers?.obiettivo || 'Non indicato';
    goals[goal] = (goals[goal] || 0) + 1;
  }
  const emails = new Set([...waitlist.map((item) => item.email), ...submissions.map((item) => item.email)]);
  return {
    contacts: emails.size,
    waitlist: waitlist.length,
    submissions: submissions.length,
    recent: submissions.filter((item) => new Date(item.createdAt).getTime() >= recentCutoff).length,
    marketingConsents: [...waitlist, ...submissions].filter((item) => item.marketingConsent).length,
    byLevel,
    goals: Object.entries(goals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
    program: {
      active: Boolean(program?.active),
      filename: program?.filename || null,
      uploadedAt: program?.uploadedAt || null,
    },
  };
}

function mergeLeads(waitlist, submissions) {
  const map = new Map();
  for (const item of waitlist) {
    map.set(item.email, {
      id: item.id,
      email: item.email,
      name: item.name,
      firstName: item.name,
      lastName: '',
      status: 'attesa',
      level: null,
      score: null,
      goal: item.goal,
      marketingConsent: item.marketingConsent,
      createdAt: item.createdAt,
      answers: null,
      improvementGoal: null,
      motivation: null,
    });
  }
  for (const item of submissions) {
    map.set(item.email, {
      ...publicSubmission(item),
      name: `${item.firstName} ${item.lastName}`.trim(),
      status: 'questionario',
      goal: item.answers?.obiettivo || null,
    });
  }
  return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function filterLeads(items, filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase();
  return items.filter((item) => {
    if (filters.status && filters.status !== 'tutti' && item.status !== filters.status) return false;
    if (filters.level && filters.level !== 'tutti' && item.level !== filters.level) return false;
    if (search && !`${item.name} ${item.email} ${item.goal || ''}`.toLowerCase().includes(search)) return false;
    return true;
  }).slice(0, Math.min(Number(filters.limit) || 200, 500));
}

export class FileRepository {
  constructor(filePath = process.env.ZAC_STORE_PATH || resolve('.data/dev-store.json')) {
    this.filePath = filePath;
    this.programDir = join(dirname(filePath), 'programs');
  }

  async read() {
    try {
      return { ...structuredClone(EMPTY_STORE), ...JSON.parse(await readFile(this.filePath, 'utf8')) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.write(structuredClone(EMPTY_STORE));
      return structuredClone(EMPTY_STORE);
    }
  }

  async write(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  async saveWaitlist(payload, meta) {
    const data = await this.read();
    const now = isoNow();
    const existing = data.waitlist.find((item) => item.email === payload.email);
    const row = {
      id: existing?.id || id(),
      ...payload,
      ipHash: meta.ipHash,
      consentAt: existing?.consentAt || now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    data.waitlist = [...data.waitlist.filter((item) => item.email !== payload.email), row];
    await this.write(data);
    return row;
  }

  async countRecent(kind, ipHash, since) {
    if (!ipHash) return 0;
    const data = await this.read();
    const rows = kind === 'waitlist' ? data.waitlist : data.submissions;
    const cutoff = new Date(since).getTime();
    return rows.filter((item) => item.ipHash === ipHash && new Date(item.createdAt).getTime() >= cutoff).length;
  }

  async saveSubmission(payload, meta) {
    const data = await this.read();
    const existing = data.submissions.find((item) => item.idempotencyKey === meta.idempotencyKey);
    if (existing) return existing;
    const now = isoNow();
    const row = {
      id: id(),
      ...payload,
      idempotencyKey: meta.idempotencyKey,
      deliveryTokenHash: meta.deliveryTokenHash,
      ipHash: meta.ipHash,
      consentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    data.submissions.push(row);
    await this.write(data);
    return row;
  }

  async findSubmissionByTokenHash(tokenHash) {
    const data = await this.read();
    return data.submissions.find((item) => item.deliveryTokenHash === tokenHash) || null;
  }

  async listLeads(filters) {
    const data = await this.read();
    return filterLeads(mergeLeads(data.waitlist, data.submissions), filters);
  }

  async stats() {
    const data = await this.read();
    return computeStats(data.waitlist, data.submissions, data.program);
  }

  async getProgram() {
    const data = await this.read();
    return data.program;
  }

  async saveProgram(buffer, filename) {
    await mkdir(this.programDir, { recursive: true });
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'programma.pdf';
    const storedName = `${Date.now()}-${safeName}`;
    const path = join(this.programDir, storedName);
    await writeFile(path, buffer, { mode: 0o600 });
    const data = await this.read();
    data.program = {
      active: true,
      filename: safeName,
      path,
      uploadedAt: isoNow(),
      updatedAt: isoNow(),
    };
    await this.write(data);
    return data.program;
  }

  async setProgramActive(active) {
    const data = await this.read();
    if (active && !data.program.path) throw new Error('Carica prima un PDF.');
    data.program.active = Boolean(active);
    data.program.updatedAt = isoNow();
    await this.write(data);
    return data.program;
  }

  async resolveProgramDownload() {
    const program = await this.getProgram();
    if (!program.active || !program.path) return null;
    return { kind: 'file', path: program.path, filename: program.filename };
  }
}

export class SupabaseRepository {
  constructor(url, key) {
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async saveWaitlist(payload, meta) {
    const row = {
      name: payload.name,
      email: payload.email,
      goal: payload.goal,
      marketing_consent: payload.marketingConsent,
      privacy_version: payload.privacyVersion,
      source: payload.source,
      utm: payload.utm,
      ip_hash: meta.ipHash,
      consent_at: isoNow(),
      updated_at: isoNow(),
    };
    const { data, error } = await this.supabase.from('waitlist_signups')
      .upsert(row, { onConflict: 'email' }).select().single();
    if (error) throw error;
    return data;
  }

  async countRecent(kind, ipHash, since) {
    if (!ipHash) return 0;
    const table = kind === 'waitlist' ? 'waitlist_signups' : 'questionnaire_submissions';
    const { count, error } = await this.supabase.from(table)
      .select('id', { head: true, count: 'exact' })
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(since).toISOString());
    if (error) throw error;
    return count || 0;
  }

  async saveSubmission(payload, meta) {
    const row = {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      age: payload.age,
      gender: payload.gender,
      answers: payload.answers,
      improvement_goal: payload.improvementGoal,
      motivation: payload.motivation,
      score: payload.score,
      level: payload.level,
      profile: payload.profile,
      questionnaire_version: payload.questionnaireVersion,
      privacy_version: payload.privacyVersion,
      marketing_consent: payload.marketingConsent,
      source: payload.source,
      utm: payload.utm,
      idempotency_key: meta.idempotencyKey,
      delivery_token_hash: meta.deliveryTokenHash,
      ip_hash: meta.ipHash,
      consent_at: isoNow(),
    };
    const { data, error } = await this.supabase.from('questionnaire_submissions').insert(row).select().single();
    if (!error) return fromDbSubmission(data);
    if (error.code === '23505') {
      const existing = await this.supabase.from('questionnaire_submissions')
        .select('*').eq('idempotency_key', meta.idempotencyKey).single();
      if (existing.error) throw existing.error;
      return fromDbSubmission(existing.data);
    }
    throw error;
  }

  async findSubmissionByTokenHash(tokenHash) {
    const { data, error } = await this.supabase.from('questionnaire_submissions')
      .select('*').eq('delivery_token_hash', tokenHash).maybeSingle();
    if (error) throw error;
    return data ? fromDbSubmission(data) : null;
  }

  async rawData() {
    const [waitlist, submissions, program] = await Promise.all([
      this.supabase.from('waitlist_signups').select('*').order('created_at', { ascending: false }).limit(500),
      this.supabase.from('questionnaire_submissions').select('*').order('created_at', { ascending: false }).limit(500),
      this.supabase.from('program_config').select('*').eq('id', 1).maybeSingle(),
    ]);
    for (const result of [waitlist, submissions, program]) if (result.error) throw result.error;
    return {
      waitlist: waitlist.data.map(fromDbWaitlist),
      submissions: submissions.data.map(fromDbSubmission),
      program: fromDbProgram(program.data),
    };
  }

  async listLeads(filters) {
    const data = await this.rawData();
    return filterLeads(mergeLeads(data.waitlist, data.submissions), filters);
  }

  async stats() {
    const data = await this.rawData();
    return computeStats(data.waitlist, data.submissions, data.program);
  }

  async getProgram() {
    const { data, error } = await this.supabase.from('program_config').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return fromDbProgram(data);
  }

  async saveProgram(buffer, filename) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'programma.pdf';
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
    const uploaded = await this.supabase.storage.from('lead-magnets').upload(path, buffer, {
      contentType: 'application/pdf', cacheControl: '3600', upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    const row = {
      id: 1,
      active: true,
      filename: safeName,
      storage_bucket: 'lead-magnets',
      storage_path: path,
      uploaded_at: isoNow(),
      updated_at: isoNow(),
    };
    const saved = await this.supabase.from('program_config').upsert(row).select().single();
    if (saved.error) throw saved.error;
    return fromDbProgram(saved.data);
  }

  async setProgramActive(active) {
    const current = await this.getProgram();
    if (active && !current.path) throw new Error('Carica prima un PDF.');
    const { data, error } = await this.supabase.from('program_config')
      .update({ active: Boolean(active), updated_at: isoNow() }).eq('id', 1).select().single();
    if (error) throw error;
    return fromDbProgram(data);
  }

  async resolveProgramDownload() {
    const program = await this.getProgram();
    if (!program.active || !program.path) return null;
    const { data, error } = await this.supabase.storage.from(program.bucket || 'lead-magnets')
      .createSignedUrl(program.path, 10 * 60, { download: program.filename });
    if (error) throw error;
    return { kind: 'redirect', url: data.signedUrl, filename: program.filename };
  }
}

function fromDbWaitlist(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    goal: row.goal,
    marketingConsent: row.marketing_consent,
    privacyVersion: row.privacy_version,
    source: row.source,
    utm: row.utm,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromDbSubmission(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    age: row.age,
    gender: row.gender,
    answers: row.answers,
    improvementGoal: row.improvement_goal,
    motivation: row.motivation,
    score: row.score,
    level: row.level,
    profile: row.profile,
    questionnaireVersion: row.questionnaire_version,
    privacyVersion: row.privacy_version,
    marketingConsent: row.marketing_consent,
    source: row.source,
    utm: row.utm,
    idempotencyKey: row.idempotency_key,
    deliveryTokenHash: row.delivery_token_hash,
    ipHash: row.ip_hash,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromDbProgram(row) {
  if (!row) return structuredClone(EMPTY_STORE.program);
  return {
    active: row.active,
    filename: row.filename,
    bucket: row.storage_bucket,
    path: row.storage_path,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}

let repository;
export function getRepository() {
  if (repository) return repository;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
    repository = new SupabaseRepository(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
    return repository;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Configurazione mancante: SUPABASE_URL / SUPABASE_SECRET_KEY');
  }
  repository = new FileRepository();
  return repository;
}

export function resetRepositoryForTests() {
  repository = undefined;
}
