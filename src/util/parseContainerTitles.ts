/*
Examples:
  'Saltburn.2023.1080p.HDR.WEB.AV1.Opus-SouAV1R',
  'Saltburn.2023.2160p.AMZN.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX-AsRequested',
  'Saltburn.2023.2160p.AMZN.WEB-DL.DDP5.1.Atmos.H.265-FLUX-AsRequested',
  'Saltburn.2023.PROPER.MULTI.1080p.WEB.H264-LOST',
  'Saltburn.2023.PROPER.MULTI.1080p.WEB.H264-LOST',
  'Saltburn.1080p.AMZN.WEB-DL.DDP5.1.H.264-PrimeFix',
  'Saltburn.1080p.AMZN.WEB-DL.DDP5.1.H.265-PrimeFix',
  'Saltburn.2023.1080p.10bit.WEBRip.6CH.x265.HEVC-PSA',
  'Saltburn.2023.MULTi.1080p.WEB.H264-AMB3R',
  'Saltburn.2023.2160p.4K.WEB.5.1-LAMA',
  'Saltburn.2023.1080p.WEBRip.x265-KONTRAST',
  'Saltburn.2023.720p.WEBRip.x265-PROTON',
  'Saltburn.2023.1080p.WEBRip.x265.10bit.5.1-LAMA',
  'Saltburn.2023.1080p.WEBRip.x265.10bit.5.1-LAMA',
  'Saltburn.2023.iTA-ENG.WEBDL.1080p.x264-Dr4gon.MIRCrew',
  'Saltburn.2023.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-FLUX',
  'Saltburn.2023.MULTI.1080p.WEB-DL.H264-AOC',
  'Saltburn.2023.1080p.AMZN.WEBRip.DDP5.1.x265.10bit-GalaxyRG265',
  'Saltburn.2023.1080p.WEBRip.5.1-LAMA',
  'Saltburn.2023.1080p.AMZN.WEB-DL.DDPA5.1.H.264-FLUX',
  'Saltburn.2023.720p.AMZN.WEB-DL.DDPA5.1.H.264-FLUX',
  'Saltburn.2023.720p.AMZN.WEBRip.900MB.x264-GalaxyRG',
  'Saltburn.2023.720p.WEBRip-LAMA',
  'Saltburn.2023.1080p.AMZN.WEBRip.1600MB.DD5.1.x264-GalaxyRG',
  'Saltburn.2023.1080p.WEB.H264-RefreshingDaintyChihuahuaOfDrizzle',
  'Saltburn.2023.1080p.WEB.H264-RefreshingDaintyChihuahuaOfDrizzle',
  'Saltburn.2023.[Turkish.Dubbed].1080p.WEB-DLRip.TeeWee',
  'Saltburn.2023.WEBScreener.Snoopy.x264'
*/

type ParserOptions = {
  /* ignore screeners */
  ignore_screeners: boolean;
  ignore_cam: boolean;
};

const parser_default_options: ParserOptions = {
  ignore_screeners: true,
  ignore_cam: true,
};

export function parse_container_title(
  title: string,
  options = parser_default_options
): {
  title: string;
  quality: string;
  languages?: string[];
} | null {
  const quality_match = /((4|1080|720|480)[p|k])/i.exec(title);
  let quality;
  if (quality_match) {
    quality = quality_match[0];
  } else {
    return null;
  }

  if (options.ignore_cam) {
    // TODO
  }

  if (options.ignore_screeners) {
    const screeners_match = /\.(WEB)?Screener\./i.exec(title);
    if (screeners_match) return null;
  }

  return {
    title: title,
    quality,
  };
}
