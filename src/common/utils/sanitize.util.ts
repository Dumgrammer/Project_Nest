import { BadRequestException } from '@nestjs/common';

const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';

const REDACT_KEYS = new Set([
  'authorization',
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
]);

const MAX_STRING_LENGTH = 2000;
const MAX_DEPTH = 8;
const MAX_NODES = 5000;

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > MAX_DEPTH) {
    return TRUNCATED;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...${TRUNCATED}`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_NODES).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_NODES);

    for (const [key, nestedValue] of entries) {
      const normalizedKey = key.toLowerCase();
      if (REDACT_KEYS.has(normalizedKey)) {
        output[key] = REDACTED;
        continue;
      }

      output[key] = sanitizeForLog(nestedValue, depth + 1);
    }
    return output;
  }

  return String(value);
}

export function validateWorkflowInput(input: unknown): asserts input is Record<string, unknown> {
  if (!input || Array.isArray(input) || typeof input !== 'object') {
    throw new BadRequestException('input must be a non-null JSON object');
  }

  validateNodeCount(input);
  validateDepth(input);
}

function validateDepth(value: unknown, depth = 0): void {
  if (value === null || value === undefined) {
    return;
  }

  if (depth > MAX_DEPTH) {
    throw new BadRequestException(
      `input exceeds max nesting depth of ${MAX_DEPTH}`,
    );
  }

  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      throw new BadRequestException(
        `input contains a string longer than ${MAX_STRING_LENGTH} characters`,
      );
    }
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      validateDepth(item, depth + 1);
    }
    return;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    validateDepth(nested, depth + 1);
  }
}

function validateNodeCount(value: unknown): void {
  let count = 0;
  const queue: unknown[] = [value];

  while (queue.length) {
    const current = queue.shift();
    count += 1;
    if (count > MAX_NODES) {
      throw new BadRequestException(
        `input exceeds max node count of ${MAX_NODES}`,
      );
    }

    if (!current || typeof current !== 'object') {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    queue.push(...Object.values(current as Record<string, unknown>));
  }
}
