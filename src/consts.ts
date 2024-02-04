export const regex = {
  quality: /((4|1080|720|480)[p|k])/i,
};

export type UserSettings = {
  premiumize: string;
  newznab_key: string;
  newznab_provider: string;
};

export const video_filetypes = [
  "webm",
  "mkv",
  "flv",
  "f4v",
  "vob",
  "mp4",
  "avi",
];
