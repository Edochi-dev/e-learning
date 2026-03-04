import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { QrCodeGateway } from './gateways/qr-code.gateway';

/**
 * QrCodeService — Implementación concreta de QrCodeGateway
 *
 * Usa la librería 'qrcode' para generar un Buffer PNG del código QR
 * a partir de una URL. El Buffer resultante se incrusta en el PDF generado.
 */
@Injectable()
export class QrCodeService implements QrCodeGateway {
    async generate(url: string): Promise<Buffer> {
        const buffer = await QRCode.toBuffer(url, {
            type: 'png',
            margin: 1,
            width: 300,
        });
        return buffer;
    }
}
