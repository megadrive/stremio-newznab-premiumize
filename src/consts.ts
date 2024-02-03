export const regex = {
  quality: /((4|1080|720|480)[p|k])/i,
};

export type UserSettings = {
  premiumize: string;
  newznab_key: string;
  newznab_provider: string;
};
