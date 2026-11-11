import { describe, it, expect } from 'vitest';
import { formatSeconds, pickRecordingMimeType, recordingFileName } from './audio-recording';

describe('audio-recording', () => {
    it('prefiere WebM/Opus cuando el navegador lo soporta (Android/Chrome)', () => {
        expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
    });

    it('cae a MP4 en Safari, que no graba WebM', () => {
        expect(pickRecordingMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    });

    it('no elige nada si el navegador no soporta ningún formato', () => {
        expect(pickRecordingMimeType(() => false)).toBeUndefined();
    });

    it('nombra el archivo según el contenedor', () => {
        expect(recordingFileName('audio/mp4')).toBe('revision.m4a');
        expect(recordingFileName('audio/webm;codecs=opus')).toBe('revision.webm');
    });

    it('formatea segundos como m:ss', () => {
        expect(formatSeconds(0)).toBe('0:00');
        expect(formatSeconds(9.7)).toBe('0:09');
        expect(formatSeconds(75)).toBe('1:15');
        expect(formatSeconds(120)).toBe('2:00');
    });
});
