import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyFetchError, logFetchFailure, logRequestFailure, toError } from './serverLog';

// Strips ANSI color codes so assertions can match on plain text regardless of the escape sequences
// wrapped around each colored segment.
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9]+m/g, '');
}

describe('classifyFetchError', () => {
  it('labels a timeout', () => {
    expect(classifyFetchError(new Error('The operation timed out'))).toEqual({ label: 'TIMEOUT', status: 504 });
  });

  it('labels a mid-response disconnect as ABORTED, including its known variants', () => {
    expect(classifyFetchError(new Error('The destination stream closed early'))).toEqual({ label: 'ABORTED', status: 499 });
    expect(classifyFetchError(new Error('read ECONNRESET'))).toEqual({ label: 'ABORTED', status: 499 });
    expect(classifyFetchError(new Error('socket hang up'))).toEqual({ label: 'ABORTED', status: 499 });
  });

  it('falls back to a generic ERROR label for anything else', () => {
    expect(classifyFetchError(new Error('WatchFooty request failed: 500'))).toEqual({ label: 'ERROR', status: 500 });
  });

  it('handles a non-Error thrown value without crashing', () => {
    expect(classifyFetchError('a plain string')).toEqual({ label: 'ERROR', status: 500 });
  });
});

describe('toError', () => {
  it('passes an Error through unchanged (by message)', () => {
    expect(toError(new Error('boom')).message).toBe('boom');
  });

  it('normalizes a non-Error value (e.g. a DOMException-shaped object) into a real Error', () => {
    const weird = { message: 'Cannot set property message of [object DOMException]' };
    const result = toError(weird);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(String(weird));
  });
});

describe('logFetchFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs in the exact "WARN GET <path> <status> in <duration> [LABEL]" shape', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const start = Date.now() - 10300; // ~10.3s ago
    logFetchFailure('GET', '/matches/football?date=2026-08-24', new Error('The operation timed out'), start);

    expect(warn).toHaveBeenCalledTimes(1);
    const line = stripAnsi(warn.mock.calls[0][0] as string);
    expect(line).toMatch(/^\s*WARN GET \/matches\/football\?date=2026-08-24 504 in 10\.[0-9]s \[TIMEOUT\]$/);
  });

  it('formats sub-second durations in milliseconds, not seconds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const start = Date.now() - 250;
    logFetchFailure('GET', '/match/123', new Error('WatchFooty request failed: 500'), start);

    const line = stripAnsi(warn.mock.calls[0][0] as string);
    expect(line).toMatch(/^\s*WARN GET \/match\/123 500 in \d+ms \[ERROR\]$/);
  });

  it('appends an optional suffix without changing the base shape', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logFetchFailure('GET', '/match/123', new Error('closed early'), Date.now(), '— falling back to the full listing');

    const line = stripAnsi(warn.mock.calls[0][0] as string);
    expect(line).toContain('[ABORTED] — falling back to the full listing');
  });

  it('never lets a raw non-Error value reach console.warn unformatted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // A DOMException-shaped object, the exact case toError exists for — this must never appear
    // in the logged line as "[object Object]" or crash while formatting it.
    logFetchFailure('GET', '/match/123', { message: 'weird' }, Date.now());

    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0] as string;
    expect(line).not.toContain('[object Object]');
  });
});

describe('logRequestFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs method/path/label without fabricating a status or duration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logRequestFailure('GET', '/match/401879301', new Error('The destination stream closed early'));

    const line = stripAnsi(warn.mock.calls[0][0] as string);
    expect(line).toBe(' WARN GET /match/401879301 [ABORTED] The destination stream closed early');
  });
});
