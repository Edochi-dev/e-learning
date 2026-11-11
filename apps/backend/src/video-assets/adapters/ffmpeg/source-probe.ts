export interface SourceVideoInfo {
  durationSeconds: number;
  /** Displayed dimensions, after applying the rotation flag. */
  width: number;
  height: number;
  hasAudio: boolean;
}

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  side_data_list?: { rotation?: number }[];
  tags?: { rotate?: string };
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

/** Parses `ffprobe -print_format json -show_streams -show_format`. */
export function parseFfprobeOutput(json: string): SourceVideoInfo {
  const output = JSON.parse(json) as FfprobeOutput;
  const streams = output.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  if (!video?.width || !video?.height) {
    throw new Error('El archivo no contiene una pista de video legible');
  }

  const duration = Number(output.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('No se pudo determinar la duración del video');
  }

  return {
    durationSeconds: Math.round(duration),
    ...(isRotatedQuarterTurn(video)
      ? { width: video.height, height: video.width }
      : { width: video.width, height: video.height }),
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

// Phones store portrait video as landscape plus a rotation flag. ffmpeg
// applies the rotation when encoding, so width and height swap.
function isRotatedQuarterTurn(stream: FfprobeStream): boolean {
  const rotation =
    stream.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ??
    Number(stream.tags?.rotate ?? 0);
  return Math.abs(rotation) % 180 === 90;
}
