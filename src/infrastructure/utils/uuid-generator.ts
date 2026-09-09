import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';

@Injectable()
export class UuidGenerator implements IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }
}
