import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoAsset } from './entities/video-asset.entity';
import { VideoAssetKey } from './entities/video-asset-key.entity';
import { VideoAssetGateway } from './gateways/video-asset.gateway';
import { HlsKeyStore } from './gateways/hls-key-store.gateway';
import { VideoTranscoder } from './gateways/video-transcoder.gateway';
import { HlsPlaylistStore } from './gateways/hls-playlist-store.gateway';
import { HlsMediaUrlSigner } from './gateways/hls-media-url-signer.gateway';
import { VideoAssetsRepository } from './video-assets.repository';
import { VideoAssetKeysRepository } from './video-asset-keys.repository';
import { FfmpegHlsTranscoder } from './adapters/ffmpeg/ffmpeg-hls-transcoder.adapter';
import {
  CpuX264Pipeline,
  CudaNvencPipeline,
  VideoPipelineProfile,
} from './adapters/ffmpeg/video-pipeline-profile';
import { FileHlsPlaylistStore } from './adapters/file-hls-playlist-store.adapter';
import { NginxSecureLinkSigner } from './adapters/nginx-secure-link-signer.adapter';
import { HlsConfig, HlsVideoEncoder } from './hls.config';
import { HlsPlaybackTokenService } from './services/hls-playback-token.service';
import { HlsEnabledGuard } from './guards/hls-enabled.guard';
import { VideoTranscodingWorker } from './video-transcoding.worker';
import { HlsController } from './hls.controller';
import { RegisterVideoAssetUseCase } from './use-cases/register-video-asset.use-case';
import { ProcessNextVideoAssetUseCase } from './use-cases/process-next-video-asset.use-case';
import { IssueHlsPlaybackUseCase } from './use-cases/issue-hls-playback.use-case';
import { GetHlsMasterPlaylistUseCase } from './use-cases/get-hls-master-playlist.use-case';
import { GetHlsVariantPlaylistUseCase } from './use-cases/get-hls-variant-playlist.use-case';
import { GetHlsKeyUseCase } from './use-cases/get-hls-key.use-case';

const PIPELINES: Record<HlsVideoEncoder, () => VideoPipelineProfile> = {
  [HlsVideoEncoder.NVENC]: () => new CudaNvencPipeline(),
  [HlsVideoEncoder.X264]: () => new CpuX264Pipeline(),
};

/**
 * Not yet connected to lessons: nothing creates assets and no lesson endpoint
 * issues playback. RegisterVideoAssetUseCase and IssueHlsPlaybackUseCase are
 * exported for the upload flow and the lesson player to call.
 */
@Module({
  imports: [TypeOrmModule.forFeature([VideoAsset, VideoAssetKey])],
  controllers: [HlsController],
  providers: [
    HlsConfig,
    HlsPlaybackTokenService,
    HlsEnabledGuard,
    VideoTranscodingWorker,
    { provide: VideoAssetGateway, useClass: VideoAssetsRepository },
    { provide: HlsKeyStore, useClass: VideoAssetKeysRepository },
    { provide: VideoTranscoder, useClass: FfmpegHlsTranscoder },
    { provide: HlsPlaylistStore, useClass: FileHlsPlaylistStore },
    { provide: HlsMediaUrlSigner, useClass: NginxSecureLinkSigner },
    {
      provide: VideoPipelineProfile,
      useFactory: (config: HlsConfig) => PIPELINES[config.encoder](),
      inject: [HlsConfig],
    },
    RegisterVideoAssetUseCase,
    ProcessNextVideoAssetUseCase,
    IssueHlsPlaybackUseCase,
    GetHlsMasterPlaylistUseCase,
    GetHlsVariantPlaylistUseCase,
    GetHlsKeyUseCase,
  ],
  exports: [RegisterVideoAssetUseCase, IssueHlsPlaybackUseCase],
})
export class VideoAssetsModule {}
