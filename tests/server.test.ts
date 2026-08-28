import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type ApiResponse = {
  ok: boolean;
  code?: string;
  duplicate?: boolean;
  errors?: Record<string, string>;
};

const validConfiguration = {
  color: '#CC22EE',
  height: 'height-100',
  rodCount: 5,
  controlMode: 'dynamic-rgb',
  brightness: 72,
  saturation: 88,
  scenario: 'custom',
};

const validLead = (suffix: string) => ({
  name: `Тест ${suffix}`,
  phone: '+7 999 000-00-00',
  email: `test-${suffix}@example.test`,
  comment: 'Изолированный API-тест.',
  consent: true,
  config: validConfiguration,
});

const getFreePort = async () =>
  await new Promise<number>((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Не удалось получить свободный TCP-порт.'));
        return;
      }
      const { port } = address;
      probe.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });

const waitForListening = async (child: ChildProcessWithoutNullStreams) =>
  await new Promise<void>((resolveReady, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Runtime не запустился. stdout: ${output}; stderr: ${errors}`));
    }, 10_000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      if (output.includes('"event":"listening"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.stderr.on('data', (chunk: string) => {
      errors += chunk;
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Runtime завершился до запуска с кодом ${code}. stderr: ${errors}`));
    });
  });

describe('preview lead API', () => {
  let runtime: ChildProcessWithoutNullStreams;
  let baseUrl: string;
  let temporaryDirectory: string;
  let submissionsFile: string;

  beforeAll(async () => {
    const port = await getFreePort();
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'anniti-api-test-'));
    submissionsFile = join(temporaryDirectory, 'submissions.jsonl');
    baseUrl = `http://127.0.0.1:${port}`;
    runtime = spawn(process.execPath, [resolve('server/index.mjs')], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        SUBMISSIONS_FILE: submissionsFile,
        RATE_LIMIT_MAX: '100',
        BUILD_ID: 'vitest-backend',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForListening(runtime);
  });

  afterAll(async () => {
    if (runtime && runtime.exitCode === null) {
      runtime.kill('SIGTERM');
      await new Promise<void>((resolveExit) => {
        const timeout = setTimeout(resolveExit, 2_000);
        runtime.once('exit', () => {
          clearTimeout(timeout);
          resolveExit();
        });
      });
    }
    if (temporaryDirectory) await rm(temporaryDirectory, { force: true, recursive: true });
  });

  const postLead = async (body: unknown, idempotencyKey?: string) => {
    const response = await fetch(`${baseUrl}/api/preview-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });
    return {
      response,
      json: (await response.json()) as ApiResponse,
    };
  };

  it('accepts and persists the complete RGB configuration schema', async () => {
    const lead = {
      ...validLead('101'),
      config: { ...validConfiguration, color: '#cc22ee' },
    };
    const { response, json } = await postLead(lead, 'server-schema-valid');

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);

    const records = (await readFile(submissionsFile, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { configuration: typeof validConfiguration });
    expect(records.at(-1)?.configuration).toEqual(validConfiguration);
  });

  it('rejects every invalid configuration field with field-specific errors', async () => {
    const { response, json } = await postLead(
      {
        ...validLead('102'),
        config: {
          color: '#FFFFFF-not-a-color',
          height: 'height90',
          rodCount: 8,
          controlMode: 'rainbow',
          brightness: '72',
          saturation: '88',
          scenario: 'sleep',
        },
      },
      'server-schema-invalid',
    );

    expect(response.status).toBe(422);
    expect(json.code).toBe('validation_failed');
    expect(json.errors).toEqual(
      expect.objectContaining({
        'config.color': expect.any(String),
        'config.height': expect.any(String),
        'config.rodCount': expect.any(String),
        'config.controlMode': expect.any(String),
        'config.brightness': expect.any(String),
        'config.saturation': expect.any(String),
        'config.scenario': expect.any(String),
      }),
    );
  });

  it('requires rodCount to be an integer and does not coerce numeric strings', async () => {
    const fractionalRods = await postLead(
      {
        ...validLead('fractional-rods'),
        config: { ...validConfiguration, rodCount: 3.5 },
      },
      'server-schema-fractional-rods',
    );
    const stringBrightness = await postLead(
      {
        ...validLead('string-brightness'),
        config: { ...validConfiguration, brightness: '72' },
      },
      'server-schema-string-brightness',
    );

    expect(fractionalRods.response.status).toBe(422);
    expect(fractionalRods.json.errors).toHaveProperty('config.rodCount');
    expect(stringBrightness.response.status).toBe(422);
    expect(stringBrightness.json.errors).toHaveProperty('config.brightness');
  });

  it.each([
    { height: 'height-80', rodCount: 3, brightness: 0, controlMode: 'static', scenario: 'focus' },
    { height: 'height-100', rodCount: 4, brightness: 20, controlMode: 'dynamic-rgb', scenario: 'rest' },
    { height: 'height-120', rodCount: 5, brightness: 50, controlMode: 'music-responsive', scenario: 'impressions' },
    { height: 'height-140', rodCount: 6, brightness: 80, controlMode: 'dynamic-rgb', scenario: 'atmosphere' },
    { height: 'height-160', rodCount: 7, brightness: 100, controlMode: 'music-responsive', scenario: 'energy' },
    { height: 'height-160', rodCount: 7, brightness: 100, controlMode: 'static', scenario: 'custom' },
  ])(
    'accepts supported values: $height, $rodCount rods, $brightness%, $controlMode, $scenario',
    async ({ height, rodCount, brightness, controlMode, scenario }) => {
      const suffix = `${height}-${scenario}`;
      const { response } = await postLead(
        {
          ...validLead(suffix),
          config: {
            ...validConfiguration,
            height,
            rodCount,
            brightness,
            controlMode,
            scenario,
          },
        },
        `supported-${height}-${scenario}`,
      );
      expect(response.status).toBe(201);
    },
  );

  it('keeps idempotent retries single-write and rejects key reuse for another payload', async () => {
    const key = 'server-idempotency-contract';
    const firstLead = validLead('103');
    const first = await postLead(firstLead, key);
    const retry = await postLead(firstLead, key);
    const conflict = await postLead(
      {
        ...firstLead,
        config: { ...validConfiguration, brightness: 73 },
      },
      key,
    );

    expect(first.response.status).toBe(201);
    expect(retry.response.status).toBe(200);
    expect(retry.json.duplicate).toBe(true);
    expect(conflict.response.status).toBe(409);
    expect(conflict.json.code).toBe('idempotency_conflict');

    const records = (await readFile(submissionsFile, 'utf8')).trim().split('\n');
    const matchingRecords = records.filter((line) => line.includes('Тест 103'));
    expect(matchingRecords).toHaveLength(1);
  });
});
