import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { HlsEnabledGuard } from './guards/hls-enabled.guard';
import { GetHlsMasterPlaylistUseCase } from './use-cases/get-hls-master-playlist.use-case';
import { GetHlsVariantPlaylistUseCase } from './use-cases/get-hls-variant-playlist.use-case';
import { GetHlsKeyUseCase } from './use-cases/get-hls-key.use-case';

const PLAYLIST_CONTENT_TYPE = 'application/vnd.apple.mpegurl';

/**
 * Authenticated by the playback token, not by the JWT: the enrollment check
 * runs once when the token is issued, and the token carries that decision
 * through the player's many requests. Segments are served by nginx, not here.
 */
@Controller('hls')
@UseGuards(HlsEnabledGuard)
export class HlsController {
  constructor(
    private readonly getMaster: GetHlsMasterPlaylistUseCase,
    private readonly getVariant: GetHlsVariantPlaylistUseCase,
    private readonly getKey: GetHlsKeyUseCase,
  ) {}

  @Get(':assetId/master.m3u8')
  @Header('Content-Type', PLAYLIST_CONTENT_TYPE)
  @Header('Cache-Control', 'no-store')
  master(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Query('token') token: string | undefined,
  ): Promise<string> {
    return this.getMaster.execute(assetId, token);
  }

  @Get(':assetId/key')
  @Header('Content-Type', 'application/octet-stream')
  @Header('Cache-Control', 'no-store')
  async key(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Query('token') token: string | undefined,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.getKey.execute(assetId, token));
  }

  @Get(':assetId/:rendition/index.m3u8')
  @Header('Content-Type', PLAYLIST_CONTENT_TYPE)
  @Header('Cache-Control', 'no-store')
  variant(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Param('rendition') rendition: string,
    @Query('token') token: string | undefined,
  ): Promise<string> {
    return this.getVariant.execute(assetId, rendition, token);
  }
}
