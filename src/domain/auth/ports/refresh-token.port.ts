export interface RefreshTokenPort {
  generateRawToken(): string;
  hash(plainToken: string): string;
}
