import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenGateway } from './gateways/token.gateway';

@Injectable()
export class JwtTokenService implements TokenGateway {
    constructor(private readonly jwtService: JwtService) { }

    sign(payload: any): string {
        return this.jwtService.sign(payload);
    }
}
