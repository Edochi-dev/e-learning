import { describe, it, expect } from 'vitest';
import { anchorFromLeft, clampBox, fitScale, isHexColor, leftEdge, realign } from './certificate-design';

describe('leftEdge / anchorFromLeft', () => {
    it('con alineación izquierda el ancla ES el borde izquierdo', () => {
        expect(leftEdge(43, 133, 'left')).toBe(43);
        expect(anchorFromLeft(43, 133, 'left')).toBe(43);
    });

    it('con alineación centrada el ancla es el centro del texto', () => {
        expect(leftEdge(109.5, 133, 'center')).toBe(43);
        expect(anchorFromLeft(43, 133, 'center')).toBe(109.5);
    });
});

describe('realign', () => {
    // El bug que imprimía el nombre corrido: al pasar a "Centrado" se guardaba
    // el borde izquierdo como si fuera el centro.
    it('pasar de izquierda a centrado no mueve el texto: el ancla pasa al centro', () => {
        expect(realign(43, 133, 'left', 'center')).toBe(109.5);
    });

    it('y volver a izquierda devuelve el borde original', () => {
        expect(realign(109.5, 133, 'center', 'left')).toBe(43);
    });

    it('sin cambio de alineación el ancla no cambia', () => {
        expect(realign(43, 133, 'left', 'left')).toBe(43);
    });
});

describe('fitScale', () => {
    const a4Landscape = { width: 841.92, height: 595.2 };

    it('ajusta por el lado que primero se queda sin espacio', () => {
        // Ancho de sobra, alto justo: manda el alto.
        expect(fitScale({ width: 2000, height: 595.2 }, a4Landscape)).toBeCloseTo(1);
        // Alto de sobra: manda el ancho.
        expect(fitScale({ width: 420.96, height: 5000 }, a4Landscape)).toBeCloseTo(0.5);
    });

    it('el zoom multiplica el ajuste', () => {
        expect(fitScale({ width: 420.96, height: 5000 }, a4Landscape, 2)).toBeCloseTo(1);
    });

    it('sin espacio medido todavía devuelve 0 (no hay nada que dibujar)', () => {
        expect(fitScale({ width: 0, height: 0 }, a4Landscape)).toBe(0);
    });
});

describe('clampBox', () => {
    const page = { width: 600, height: 800 };

    it('no deja que una caja salga de la hoja', () => {
        expect(clampBox(-10, -5, { width: 90, height: 90 }, page)).toEqual({ x: 0, y: 0 });
        expect(clampBox(590, 790, { width: 90, height: 90 }, page)).toEqual({ x: 510, y: 710 });
    });

    it('dentro de la hoja no la toca', () => {
        expect(clampBox(100, 200, { width: 90, height: 90 }, page)).toEqual({ x: 100, y: 200 });
    });
});

describe('isHexColor', () => {
    it('acepta solo #RRGGBB, como el backend', () => {
        expect(isHexColor('#1a1A1a')).toBe(true);
        expect(isHexColor('#fff')).toBe(false);
        expect(isHexColor('rojo')).toBe(false);
        expect(isHexColor('1a1a1a')).toBe(false);
    });
});
