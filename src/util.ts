import nameToImdb from "name-to-imdb";
import { promisify } from "util";
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
