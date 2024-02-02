import { parse_imdb_id } from "../util";

const fetch_headers = {
  "Cache-Control": "maxage=3600, stale-while-revalidate",
};

export const cinemeta = {
  get: async (type: "movie" | "series" | string, imdb_id: string) => {
    const { id } = parse_imdb_id(imdb_id);
    console.log(`[${imdb_id}]: Getting Cinemeta meta information`);
    const meta = await (
      await fetch(`https://cinemeta-live.strem.io/meta/${type}/${id}.json`, {
        headers: fetch_headers,
      })
    ).json();

    return meta?.meta;
  },
};

export class CinemetaError extends Error {}
