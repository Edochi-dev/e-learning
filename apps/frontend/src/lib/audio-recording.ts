/** Máximo que acepta el backend para una nota de voz de revisión. */
export const MAX_REVIEW_SECONDS = 120;

// Android/Chrome graban WebM/Opus y Safari (iPhone) solo MP4/AAC. El backend
// normaliza cualquiera de los dos, así que basta con el primero que soporte.
const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

export function pickRecordingMimeType(
    isSupported: (type: string) => boolean,
): string | undefined {
    return CANDIDATE_TYPES.find((type) => isSupported(type));
}

export function recordingFileName(mimeType: string): string {
    return mimeType.startsWith('audio/mp4') ? 'revision.m4a' : 'revision.webm';
}

/** 75 → "1:15". */
export function formatSeconds(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
