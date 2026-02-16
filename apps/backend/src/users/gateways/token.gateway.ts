export abstract class TokenGateway {
    abstract sign(payload: any): string;
}
