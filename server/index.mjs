import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = toInteger(process.env.PORT, 3086, 1, 65_535);
const DIST_DIR = resolve(
  process.env.DIST_DIR || fileURLToPath(new URL('../dist/', import.meta.url)),
);
const SUBMISSIONS_FILE =
  process.env.SUBMISSIONS_FILE ||
  '/var/lib/anniti-smart-preview/submissions/test-submissions.jsonl';
const BUILD_ID = process.env.BUILD_ID || 'development';
const MAX_BODY_BYTES = toInteger(process.env.MAX_BODY_BYTES, 65_536, 1_024, 1_048_576);
const RATE_LIMIT_WINDOW_MS = toInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  10 * 60 * 1_000,
  10_000,
  24 * 60 * 60 * 1_000,
);
const RATE_LIMIT_MAX = toInteger(process.env.RATE_LIMIT_MAX, 5, 1, 1_000);
const IDEMPOTENCY_TTL_MS = toInteger(
  process.env.IDEMPOTENCY_TTL_MS,
  24 * 60 * 60 * 1_000,
  60_000,
  7 * 24 * 60 * 60 * 1_000,
);

const rateLimits = new Map();
const idempotencyRecords = new Map();
let journalQueue = Promise.resolve();

const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function toInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function applyCommonHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; upgrade-insecure-requests",
  );
}

function writeJson(response, status, value, extraHeaders = {}) {
  applyCommonHeaders(response);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [name, headerValue] of Object.entries(extraHeaders)) {
    response.setHeader(name, headerValue);
  }
  response.writeHead(status);
  response.end(JSON.stringify(value));
}

function writeText(response, status, value, contentType = 'text/plain; charset=utf-8') {
  applyCommonHeaders(response);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', contentType);
  response.writeHead(status);
  response.end(value);
}

function clientAddress(request) {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
}

function consumeRateLimit(address) {
  const now = Date.now();
  const existing = rateLimits.get(address);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimits.set(address, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - existing.count),
    resetAt: existing.resetAt,
  };
}

async function readJsonBody(request) {
  const contentType = request.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Ожидается JSON-запрос.');
  }

  const contentLength = Number.parseInt(request.headers['content-length'] || '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, 'payload_too_large', 'Слишком большой объём данных.');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_BODY_BYTES) {
      throw new HttpError(413, 'payload_too_large', 'Слишком большой объём данных.');
    }
    chunks.push(chunk);
  }

  if (received === 0) {
    throw new HttpError(400, 'empty_body', 'Пустой запрос.');
  }

  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TypeError('Expected object');
    }
    return parsed;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Неверный JSON.');
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function validateSubmission(body) {
  const errors = {};
  const name = cleanText(body.name, 100);
  const phone = cleanText(body.phone, 32);
  const email = cleanText(body.email, 254).toLowerCase();
  const comment = cleanText(body.comment, 2_000);
  const honeypot = cleanText(body.website ?? body.company ?? body._company, 200);

  if (name.length < 2) errors.name = 'Укажите имя.';

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 18 || !/^[+()\d\s.-]+$/.test(phone)) {
    errors.phone = 'Проверьте формат телефона.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Проверьте email.';
  }

  if (body.consent !== true) errors.consent = 'Нужно согласие на обработку данных.';

  let rawConfiguration = body.config ?? body.configuration;
  if (typeof rawConfiguration === 'string') {
    try {
      rawConfiguration = JSON.parse(rawConfiguration);
    } catch {
      rawConfiguration = null;
    }
  }
  const configuration = {
    color: cleanText(rawConfiguration?.color, 100).toUpperCase(),
    height: cleanText(rawConfiguration?.height, 20),
    rodCount: rawConfiguration?.rodCount,
    controlMode: cleanText(rawConfiguration?.controlMode, 40),
    brightness: rawConfiguration?.brightness,
    saturation: rawConfiguration?.saturation,
    scenario: cleanText(rawConfiguration?.scenario, 40),
  };

  if (!rawConfiguration || typeof rawConfiguration !== 'object' || Array.isArray(rawConfiguration)) {
    errors.config = 'Конфигурация не передана.';
  } else {
    if (!/^#[0-9A-F]{6}$/.test(configuration.color)) {
      errors['config.color'] = 'Цвет должен быть в формате #RRGGBB.';
    }
    if (!['height-80', 'height-100', 'height-120', 'height-140', 'height-160'].includes(configuration.height)) {
      errors['config.height'] = 'Выберите поддерживаемую высоту.';
    }
    if (
      typeof configuration.rodCount !== 'number' ||
      !Number.isInteger(configuration.rodCount) ||
      configuration.rodCount < 3 ||
      configuration.rodCount > 7
    ) {
      errors['config.rodCount'] = 'Количество стержней должно быть целым числом от 3 до 7.';
    }
    if (!['static', 'dynamic-rgb', 'music-responsive'].includes(configuration.controlMode)) {
      errors['config.controlMode'] = 'Выберите поддерживаемый режим управления.';
    }
    if (
      typeof configuration.brightness !== 'number' ||
      !Number.isFinite(configuration.brightness) ||
      configuration.brightness < 0 ||
      configuration.brightness > 100
    ) {
      errors['config.brightness'] = 'Яркость должна быть от 0 до 100.';
    }
    if (
      typeof configuration.saturation !== 'number' ||
      !Number.isFinite(configuration.saturation) ||
      configuration.saturation < 0 ||
      configuration.saturation > 100
    ) {
      errors['config.saturation'] = 'Насыщенность должна быть от 0 до 100.';
    }
    if (!['focus', 'rest', 'impressions', 'atmosphere', 'energy', 'custom'].includes(configuration.scenario)) {
      errors['config.scenario'] = 'Выберите поддерживаемый сценарий.';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'validation_failed', JSON.stringify(errors));
  }

  return { name, phone, email, comment, consent: true, configuration, honeypot };
}

function stablePayloadHash(submission) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        name: submission.name,
        phone: submission.phone,
        email: submission.email,
        comment: submission.comment,
        configuration: submission.configuration,
      }),
    )
    .digest('hex');
}

function idempotencyKey(request, address, payloadHash) {
  const supplied = request.headers['idempotency-key'];
  const raw = Array.isArray(supplied) ? supplied[0] : supplied;
  if (raw) {
    if (raw.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(raw)) {
      throw new HttpError(400, 'invalid_idempotency_key', 'Неверный Idempotency-Key.');
    }
    return `header:${raw}`;
  }
  return `derived:${createHash('sha256').update(`${address}\n${payloadHash}`).digest('hex')}`;
}

function appendSubmission(record) {
  journalQueue = journalQueue
    .catch(() => undefined)
    .then(async () => {
      const lastSeparator = Math.max(
        SUBMISSIONS_FILE.lastIndexOf('/'),
        SUBMISSIONS_FILE.lastIndexOf('\\'),
      );
      const directory = lastSeparator >= 0 ? SUBMISSIONS_FILE.slice(0, lastSeparator) : '.';
      await mkdir(directory, { recursive: true, mode: 0o750 });
      await appendFile(SUBMISSIONS_FILE, `${JSON.stringify(record)}\n`, {
        encoding: 'utf8',
        mode: 0o640,
      });
    });
  return journalQueue;
}

async function handleLead(request, response) {
  if (request.method === 'OPTIONS') {
    applyCommonHeaders(response);
    response.setHeader('Allow', 'POST, OPTIONS');
    response.setHeader('Cache-Control', 'no-store');
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    writeJson(
      response,
      405,
      { ok: false, code: 'method_not_allowed', message: 'Метод не разрешён.' },
      { Allow: 'POST, OPTIONS' },
    );
    return;
  }

  const address = clientAddress(request);
  const limit = consumeRateLimit(address);
  const rateHeaders = {
    'RateLimit-Limit': String(RATE_LIMIT_MAX),
    'RateLimit-Remaining': String(limit.remaining),
    'RateLimit-Reset': String(Math.ceil(limit.resetAt / 1_000)),
  };
  if (!limit.allowed) {
    writeJson(
      response,
      429,
      { ok: false, code: 'rate_limited', message: 'Слишком много попыток. Повторите позже.' },
      { ...rateHeaders, 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1_000)) },
    );
    return;
  }

  const body = await readJsonBody(request);
  const rawHoneypot = cleanText(body.website ?? body.company ?? body._company, 200);
  if (rawHoneypot) {
    writeJson(
      response,
      202,
      { ok: true, requestId: randomUUID(), message: 'Заявка принята.' },
      rateHeaders,
    );
    return;
  }

  const submission = validateSubmission(body);

  const payloadHash = stablePayloadHash(submission);
  const key = idempotencyKey(request, address, payloadHash);
  const existing = idempotencyRecords.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    if (existing.payloadHash !== payloadHash) {
      throw new HttpError(
        409,
        'idempotency_conflict',
        'Idempotency-Key уже использован для другой заявки.',
      );
    }
    const existingResult = existing.result ?? (await existing.pendingWrite);
    writeJson(response, 200, { ...existingResult, duplicate: true }, rateHeaders);
    return;
  }

  const requestId = randomUUID();
  const record = {
    requestId,
    submittedAt: new Date().toISOString(),
    source: 'anniti-smart-aurora-preview',
    buildId: BUILD_ID,
    name: submission.name,
    phone: submission.phone,
    email: submission.email || null,
    comment: submission.comment || null,
    consent: true,
    configuration: submission.configuration,
    clientFingerprint: createHash('sha256').update(address).digest('hex').slice(0, 24),
  };

  const result = { ok: true, requestId, message: 'Заявка сохранена в тестовом контуре.' };
  const pendingWrite = appendSubmission(record).then(() => result);
  const idempotencyRecord = {
    payloadHash,
    pendingWrite,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  };
  idempotencyRecords.set(key, idempotencyRecord);

  try {
    await pendingWrite;
    idempotencyRecord.result = result;
    delete idempotencyRecord.pendingWrite;
  } catch (error) {
    idempotencyRecords.delete(key);
    throw error;
  }
  writeJson(response, 201, result, rateHeaders);
}

function isSensitivePath(pathname) {
  const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
  return (
    firstSegment.startsWith('.') ||
    ['backup', 'deploy', 'docs', 'references', 'scripts', 'server'].includes(firstSegment) ||
    ['dockerfile', 'package.json', 'package-lock.json'].includes(firstSegment)
  );
}

function safeStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'bad_path', 'Неверный URL.');
  }

  if (decoded.includes('\0') || isSensitivePath(decoded)) {
    throw new HttpError(404, 'not_found', 'Страница не найдена.');
  }

  const relativePath = decoded.replace(/^\/+/, '') || 'index.html';
  const candidate = resolve(DIST_DIR, relativePath);
  if (candidate !== DIST_DIR && !candidate.startsWith(`${DIST_DIR}${sep}`)) {
    throw new HttpError(404, 'not_found', 'Страница не найдена.');
  }
  return candidate;
}

async function sendStatic(request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    applyCommonHeaders(response);
    response.setHeader('Allow', 'GET, HEAD');
    response.writeHead(405);
    response.end();
    return;
  }

  if (pathname === '/robots.txt') {
    writeText(response, 200, 'User-agent: *\nDisallow: /\n');
    return;
  }

  let filePath = safeStaticPath(pathname);
  let fileStat;
  try {
    fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = resolve(filePath, 'index.html');
      fileStat = await stat(filePath);
    }
  } catch {
    if (!extname(pathname)) {
      filePath = resolve(DIST_DIR, 'index.html');
      try {
        fileStat = await stat(filePath);
      } catch {
        throw new HttpError(404, 'not_found', 'Страница не найдена.');
      }
    } else {
      throw new HttpError(404, 'not_found', 'Файл не найден.');
    }
  }

  if (!fileStat.isFile()) throw new HttpError(404, 'not_found', 'Файл не найден.');

  applyCommonHeaders(response);
  const extension = extname(filePath).toLowerCase();
  const isFingerprintedAsset =
    pathname.startsWith('/assets/') && /-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(pathname);
  response.setHeader('Content-Type', contentTypes.get(extension) || 'application/octet-stream');
  response.setHeader('Content-Length', String(fileStat.size));
  response.setHeader(
    'Cache-Control',
    extension === '.html'
      ? 'no-store'
      : isFingerprintedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
  );
  response.writeHead(200);

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath)
    .on('error', () => response.destroy())
    .pipe(response);
}

async function handleRequest(request, response) {
  const url = new URL(request.url || '/', 'http://preview.internal');

  if (url.pathname === '/healthz') {
    writeJson(response, 200, {
      ok: true,
      service: 'anniti-smart-preview',
      buildId: BUILD_ID,
      uptimeSeconds: Math.floor(process.uptime()),
    });
    return;
  }

  if (url.pathname === '/api/preview-lead') {
    await handleLead(request, response);
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    writeJson(response, 404, { ok: false, code: 'not_found', message: 'Маршрут не найден.' });
    return;
  }

  await sendStatic(request, response, url.pathname);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (response.headersSent) {
      response.destroy();
      return;
    }

    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : 'internal_error';
    let message = error instanceof HttpError ? error.message : 'Внутренняя ошибка сервера.';
    let errors;
    if (code === 'validation_failed') {
      try {
        errors = JSON.parse(message);
        message = 'Проверьте поля формы.';
      } catch {
        errors = undefined;
      }
    }
    writeJson(response, status, { ok: false, code, message, ...(errors ? { errors } : {}) });
  });
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

server.listen(PORT, HOST, () => {
  process.stdout.write(
    JSON.stringify({ event: 'listening', host: HOST, port: PORT, buildId: BUILD_ID }) + '\n',
  );
});

function shutdown(signal) {
  process.stdout.write(JSON.stringify({ event: 'shutdown', signal }) + '\n');
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
  for (const [key, entry] of idempotencyRecords) {
    if (entry.expiresAt <= now) idempotencyRecords.delete(key);
  }
}, 60_000).unref();
