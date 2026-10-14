export const VideoAssetStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type VideoAssetStatus =
  (typeof VideoAssetStatus)[keyof typeof VideoAssetStatus];
