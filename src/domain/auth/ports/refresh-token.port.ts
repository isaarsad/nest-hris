export interface RefreshTokenPort {
  generate(): string;
  hash(plainToken: string): string;
  getExpiresAt(): Date;
}
