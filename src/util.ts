import { type UserSettings } from "./consts";
import nameToImdb from "name-to-imdb";
import { type } from "os";
import { promisify } from "util";
import { cinemeta } from "./providers/cinemeta";
export const name_to_imdb = promisify(nameToImdb);

/**
 * Returns only certain matches, performed the null match.
 * @param matcher Regex.exec result
 * @param matches_to_return The matches to return
 */
export const regex_exec = (
  matcher: ReturnType<RegExp["exec"]>,
  matches_to_return: number[]
) => {
  return matcher ? matches_to_return.map((m) => matcher[m]) : [];
};

export type ParsedStremioID = {
  id: string;
  type: "movie" | "series";
  season?: number;
  episode?: number;
};

export const parse_imdb_id = (imdb_id: string): ParsedStremioID => {
  const [id, season, episode] = imdb_id.split(":");
  const rv: ParsedStremioID = {
    id,
    type: season && episode ? "series" : "movie",
  };
  if (season) rv.season = +season;
  if (episode) rv.episode = +episode;
  return rv;
};

export const generate_filename = async (imdb_id: string): Promise<string> => {
  const info = parse_imdb_id(imdb_id);

  const meta = await cinemeta.get(info.type, imdb_id);

  // remove non alphanumeric
  const name = meta.name.replace(/[^A-Za-z0-9 \.]/g, "");
  const season = `S${info.season && info.season < 10 ? "0" : ""}${info.season}`;
  const episode = `E${info.episode && info.episode < 10 ? "0" : ""}${
    info.episode
  }`;

  return [name, season, episode].join(" ");
};

export const user_settings = {
  encode: (settings: Record<string, any>): string => {
    return btoa(JSON.stringify(settings));
  },
  decode: (settings: string): UserSettings => {
    return JSON.parse(atob(settings));
  },
};
