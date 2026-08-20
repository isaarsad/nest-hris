export abstract class RefreshTokenPort {
  abstract generateRawToken(): string;
  abstract hash(plainToken: string): string;
}
