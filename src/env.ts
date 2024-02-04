import { config } from "dotenv";
config(); // ensure it's populated

import { cleanEnv, num, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  NEWZNAB_API_BASEURL: url(),
  NEWZNAB_API_KEY: str(),

  PREMIUMIZE_API_BASEURL: url({ default: "https://www.premiumize.me/api" }),
  PREMIUMIZE_API_KEY: str(),
  PREMIUMIZE_API_FOLDER: str({ default: "stremio_nzbs" }),

  DATABASE_URL: str({ default: "file:./database.sqlite" }),

  PORT: num({ default: 55932 }),
  BASE_URL: str({ default: "http://127.0.0.1:55932" }),
});
