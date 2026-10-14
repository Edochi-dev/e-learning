import { Rendition, peakBitrateKbps } from '../../domain/rendition-ladder';

/** How the video of one output stream is encoded: GPU or CPU H.264. */
export abstract class VideoEncoderProfile {
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

export class NvencEncoderProfile extends VideoEncoderProfile {
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

export class X264EncoderProfile extends VideoEncoderProfile {
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
