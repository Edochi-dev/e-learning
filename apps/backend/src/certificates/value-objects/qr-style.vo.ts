/**
 * QrStyle — Value Object que agrupa la configuración del código QR.
 *
 * Solo 3 campos: posición X, Y, y tamaño. El QR no tiene color ni font
 * porque es una imagen rasterizada generada por la librería qrcode.
 */
export interface QrStyle {
  positionX: number;
  positionY: number;
  size: number;
}

export const DEFAULT_QR_STYLE: QrStyle = {
  positionX: 0,
  positionY: 0,
  size: 80,
};
