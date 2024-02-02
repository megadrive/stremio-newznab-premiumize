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
  console.log(matcher);
  return matcher ? matches_to_return.map((m) => matcher[m]) : [];
};

export const parse_imdb_id = (imdb_id: string) => {
  const [id, season, episode] = imdb_id.split(";");
  return { id, season, episode };
};
