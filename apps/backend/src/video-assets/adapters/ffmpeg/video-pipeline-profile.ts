import {
  Dimensions,
  Rendition,
  peakBitrateKbps,
} from '../../domain/rendition-ladder';

/**
 * Where frames are decoded, scaled and encoded. The three steps go together:
 * mixing a CPU decoder with a GPU encoder copies every frame across the bus,
 * which measured slower than keeping the whole chain on one side.
 */
export abstract class VideoPipelineProfile {
  /** Input options, placed before the source's `-i`. */
  abstract decodeArgs(): string[];

  /** format=yuv420p: phones record 10-bit HDR, which 8-bit H.264 cannot take. */
  abstract scaleFilter(size: Dimensions): string;

  abstract videoArgs(streamIndex: number, rendition: Rendition): string[];

  protected rateControlArgs(i: number, rendition: Rendition): string[] {
    const kbps = rendition.videoBitrateKbps;
    return [
      `-b:v:${i}`,
      `${kbps}k`,
      `-maxrate:v:${i}`,
      `${peakBitrateKbps(rendition)}k`,
      `-bufsize:v:${i}`,
      `${Math.round(kbps * 1.5)}k`,
    ];
  }
}

/**
 * Frames never leave the GPU. Limitation: a source codec NVDEC cannot decode
 * (ProRes, for instance) fails here instead of falling back to the CPU; OBS
 * and phone recordings (H.264/HEVC) are all GPU-decodable.
 */
export class CudaNvencPipeline extends VideoPipelineProfile {
  decodeArgs(): string[] {
    return ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'];
  }

  scaleFilter({ width, height }: Dimensions): string {
    return `scale_cuda=${width}:${height}:format=yuv420p`;
  }

  videoArgs(i: number, rendition: Rendition): string[] {
    return [
      `-c:v:${i}`,
      'h264_nvenc',
      `-preset:v:${i}`,
      'p5',
      `-profile:v:${i}`,
      'high',
      `-rc:v:${i}`,
      'vbr',
      ...this.rateControlArgs(i, rendition),
    ];
  }
}

export class CpuX264Pipeline extends VideoPipelineProfile {
  decodeArgs(): string[] {
    return [];
  }

  scaleFilter({ width, height }: Dimensions): string {
    return `scale=${width}:${height},format=yuv420p`;
  }

  videoArgs(i: number, rendition: Rendition): string[] {
    return [
      `-c:v:${i}`,
      'libx264',
      `-preset:v:${i}`,
      'veryfast',
      `-profile:v:${i}`,
      'high',
      ...this.rateControlArgs(i, rendition),
    ];
  }
}
