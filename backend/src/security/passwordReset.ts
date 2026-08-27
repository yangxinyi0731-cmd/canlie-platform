import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_COOLDOWN_MS = 60 * 1000;
const DEFAULT_MAX_VERIFY_ATTEMPTS = 5;

export interface ResetCodeSender {
  send(phone: string, code: string, expiresInSeconds: number): Promise<void>;
}

interface PendingResetCode {
  digest: Buffer;
  salt: Buffer;
  expiresAt: number;
  attemptsRemaining: number;
}

export type ResetCodeIssueResult =
  | { status: 'sent'; expiresInSeconds: number }
  | { status: 'unavailable' }
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'delivery_failed' };

interface PasswordResetCodeServiceOptions {
  digestSecret: string;
  sender: ResetCodeSender | null;
  ttlMs?: number;
  cooldownMs?: number;
  maxVerifyAttempts?: number;
  now?: () => number;
  codeGenerator?: () => string;
  saltGenerator?: () => Buffer;
}

export class PasswordResetCodeService {
  private readonly pendingCodes = new Map<string, PendingResetCode>();
  private readonly lastIssueAttemptAt = new Map<string, number>();
  private readonly digestSecret: string;
  private readonly sender: ResetCodeSender | null;
  private readonly ttlMs: number;
  private readonly cooldownMs: number;
  private readonly maxVerifyAttempts: number;
  private readonly now: () => number;
  private readonly codeGenerator: () => string;
  private readonly saltGenerator: () => Buffer;

  constructor(options: PasswordResetCodeServiceOptions) {
    if (Buffer.byteLength(options.digestSecret, 'utf8') < 32) {
      throw new Error('Password reset digest secret must be at least 32 bytes long.');
    }

    this.digestSecret = options.digestSecret;
    this.sender = options.sender;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.maxVerifyAttempts = options.maxVerifyAttempts ?? DEFAULT_MAX_VERIFY_ATTEMPTS;
    this.now = options.now ?? Date.now;
    this.codeGenerator = options.codeGenerator
      ?? (() => randomInt(0, 1_000_000).toString().padStart(6, '0'));
    this.saltGenerator = options.saltGenerator ?? (() => randomBytes(16));
  }

  isDeliveryConfigured(): boolean {
    return this.sender !== null;
  }

  async issue(phone: string): Promise<ResetCodeIssueResult> {
    if (!this.sender) return { status: 'unavailable' };

    const now = this.now();
    this.pruneExpired(now);

    const lastAttempt = this.lastIssueAttemptAt.get(phone);
    if (lastAttempt !== undefined && now - lastAttempt < this.cooldownMs) {
      return {
        status: 'rate_limited',
        retryAfterSeconds: Math.ceil((this.cooldownMs - (now - lastAttempt)) / 1000),
      };
    }

    // Invalidate any previous code before attempting a replacement. If the
    // provider fails, no old or newly generated code remains usable.
    this.pendingCodes.delete(phone);
    this.lastIssueAttemptAt.set(phone, now);

    const code = this.codeGenerator();
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Reset code generator must return exactly six digits.');
    }

    const salt = this.saltGenerator();
    const expiresAt = now + this.ttlMs;
    const expiresInSeconds = Math.ceil(this.ttlMs / 1000);
    const pendingCode: PendingResetCode = {
      digest: this.digest(phone, code, salt),
      salt,
      expiresAt,
      attemptsRemaining: this.maxVerifyAttempts,
    };

    try {
      await this.sender.send(phone, code, expiresInSeconds);
    } catch {
      return { status: 'delivery_failed' };
    }

    this.pendingCodes.set(phone, pendingCode);
    return { status: 'sent', expiresInSeconds };
  }

  verifyAndConsume(phone: string, code: string): boolean {
    if (!/^\d{6}$/.test(code)) return false;

    const now = this.now();
    const pendingCode = this.pendingCodes.get(phone);
    if (!pendingCode) return false;

    if (pendingCode.expiresAt <= now || pendingCode.attemptsRemaining <= 0) {
      this.pendingCodes.delete(phone);
      return false;
    }

    const candidateDigest = this.digest(phone, code, pendingCode.salt);
    const matches = timingSafeEqual(candidateDigest, pendingCode.digest);
    if (!matches) {
      pendingCode.attemptsRemaining -= 1;
      if (pendingCode.attemptsRemaining <= 0) this.pendingCodes.delete(phone);
      return false;
    }

    // Consume synchronously before the caller performs any asynchronous work,
    // preventing concurrent reset requests from reusing the same code.
    this.pendingCodes.delete(phone);
    return true;
  }

  private digest(phone: string, code: string, salt: Buffer): Buffer {
    return createHmac('sha256', this.digestSecret)
      .update('canlie-password-reset-v1\0')
      .update(phone)
      .update('\0')
      .update(salt)
      .update('\0')
      .update(code)
      .digest();
  }

  private pruneExpired(now: number): void {
    for (const [phone, pendingCode] of this.pendingCodes) {
      if (pendingCode.expiresAt <= now) this.pendingCodes.delete(phone);
    }
    for (const [phone, attemptedAt] of this.lastIssueAttemptAt) {
      if (now - attemptedAt >= this.cooldownMs) this.lastIssueAttemptAt.delete(phone);
    }
  }
}

type FetchLike = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    redirect: 'error';
    signal: AbortSignal;
  },
) => Promise<{ ok: boolean }>;

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname === '::1';
}

/**
 * Creates an SMS delivery adapter without exposing codes through this API.
 * Production requires an HTTPS webhook and bearer token. Development may use
 * an HTTP loopback mock service, which receives the random code out-of-band.
 */
export function createEnvironmentResetCodeSender(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation: FetchLike = globalThis.fetch as FetchLike,
): ResetCodeSender | null {
  if (typeof fetchImplementation !== 'function') return null;

  const configuredUrl = environment.RESET_SMS_WEBHOOK_URL?.trim();
  if (!configuredUrl) return null;

  let webhookUrl: URL;
  try {
    webhookUrl = new URL(configuredUrl);
  } catch {
    return null;
  }
  if (webhookUrl.username || webhookUrl.password) return null;

  const production = environment.NODE_ENV === 'production';
  const secureProductionUrl = webhookUrl.protocol === 'https:';
  const safeDevelopmentUrl = secureProductionUrl
    || (webhookUrl.protocol === 'http:' && isLoopbackHost(webhookUrl.hostname));
  if ((production && !secureProductionUrl) || (!production && !safeDevelopmentUrl)) {
    return null;
  }

  const bearerToken = environment.RESET_SMS_WEBHOOK_TOKEN?.trim();
  if (production && !bearerToken) return null;

  return {
    async send(phone, code, expiresInSeconds) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      };
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

      try {
        const response = await fetchImplementation(webhookUrl.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            purpose: 'password_reset',
            phone,
            code,
            expiresInSeconds,
          }),
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Provider rejected reset-code delivery.');
      } catch {
        // Never propagate provider response bodies or request data into logs.
        throw new Error('Reset-code delivery failed.');
      }
    },
  };
}
