import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { HlsConfig } from '../hls.config';

/** While HLS_ENABLED is off the endpoints behave as if they did not exist. */
@Injectable()
export class HlsEnabledGuard implements CanActivate {
  constructor(private readonly config: HlsConfig) {}

  canActivate(): boolean {
    if (!this.config.enabled) throw new NotFoundException();
    return true;
  }
}
