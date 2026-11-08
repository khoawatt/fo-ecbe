export interface SessionMetadata {
  deviceId?: string | null;
  deviceName?: string | null;
  userAgent?: string | null;
}

export interface AccountSessionRepositoryInterface {
  createSession(accountId: string, sessionId: string, tokenHash: string, expiresAt: Date, metadata: SessionMetadata): Promise<boolean>;
  rotateIfCurrent(accountId: string, sessionId: string, expectedHash: string, nextHash: string, nextExpiry: Date): Promise<boolean>;
  revokeIfCurrent(accountId: string, sessionId: string, expectedHash: string): Promise<boolean>;
}
