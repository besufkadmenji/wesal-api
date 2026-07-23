import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

@Injectable()
export class OtpCodeGenerator {
  generate(): string {
    return randomInt(0, 10_000).toString().padStart(4, '0');
  }
}
