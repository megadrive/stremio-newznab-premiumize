import { regex } from "../consts";
import { env } from "../env";
import { regex_exec } from "../util";
import { CinemetaError, cinemeta } from "./cinemeta";

const Qualities = {
  "4k": ["4k", "2160p", "UHD"],
  "1080p": ["1080p", "HD"],
  "720p": ["720p"],
  "480p": ["480p"],
} as const;

type NewznabAPIInfo = {
  "@attributes": {
    version: string;
  };
  channel: {
    title: string;
    description: string;
    link: string;
    language: string;
    webMaster: string;
    category: Record<string, any>;
    image: {
      url: string;
      title: string;
      link: string;
      description: string;
    };
    item: NewznabAPIItem[];
  };
};

type NewznabAPIItem = {
  title: string;
  guid: string;
  link: string;
  comments: string;
  pubDate: string;
  category: string;
  description: string;
  enclosure: {
    "@attributes": {
      url: string;
      length: string;
      type: string;
    };
  };
  attr: {
    "@attributes": {
      name: string;
      value: string;
    };
  }[];
};

export type NewznabAPIResponse = NewznabAPIInfo & {
  response: {
    "@attributes": {
      offset: string;
      total: string;
    };
  };
};

class NZBFetchGetError extends Error {}

// https://api.nzbgeek.info/api?t=movie&imdbid=08009314&limit=50&o=json&apikey=MA801QWu9MffN6uJpzAEGiu4jD5zgRUH
const Newznab_URLs = {
  movies: `${env.NEWZNAB_API_BASEURL}/api?t={type}&imdbid={id}&limit=50&o=json&apikey=${env.NEWZNAB_API_KEY}`,
  search: `${env.NEWZNAB_API_BASEURL}/api?t=search&q={query}&cat=5000&limit=50&extended=1&o=json&apikey=${env.NEWZNAB_API_KEY}`,
};

const generate_api_url = async (
  type: "movie" | "series" | string,
  id: string
) => {
  let url: string | undefined = undefined;

  if (type === "movie") {
    url = Newznab_URLs.movies
      .replace(/\{type\}/g, type)
      .replace(/\{id\}/g, id.replace(/[^0-9]+/g, ""));
  }

  if (type === "series") {
    try {
      const meta = await cinemeta.get(type, id);
      const name = meta.name;
      url = Newznab_URLs.search.replace(/\{query\}/g, name);
    } catch (error) {
      console.log(error);
    }
  }

  console.log(`Generated URL: ${url ?? "something happened and it broke rip"}`);
  return url;
};

const fetch_headers = {
  "Cache-Control": "maxage=3600, stale-while-revalidate",
};

/**
 * Parses the title for information, optionally getting Cinemeta info.
 * @param title The Newznab API provided title
 */
const parse_api_result = (
  item: NewznabAPIItem,
  imdb_id: string
): {
  imdb_id: string;
  title: string;
  quality: keyof typeof Qualities | string; // TODO: figure out how to remove the | string
  url: string;
} => {
  const title = item.title;
  const [quality] = regex_exec(regex.quality.exec(item.title), [0]);
  const url = item.link;

  console.log({ imdb_id, title, quality, url });

  return {
    imdb_id,
    title,
    quality,
    url,
  };
};

/**
 * Gets a set of results based on an IMDB ID
 * @param type Type provided by Stremio
 * @param id IMDB ID provided by Stremio
 */
const get = async (type: "movie" | "series" | string, id: string) => {
  try {
    const url = await generate_api_url(type, id);
    if (!url)
      throw new NZBFetchGetError(
        `Couldn't generate Newznab URL: ${{ type, id }}`
      );

    const res = await fetch(url, {
      headers: fetch_headers,
      method: "GET",
    });
    if (!res.ok) throw new NZBFetchGetError(url);

    const json = (await res.json()) as NewznabAPIResponse;
    return json;
  } catch (error) {
    console.error(error);
  }
};

/**
 * Gets a set of items with parsed titles.
 * @param type Type provided by Stremio
 * @param id IMDB ID provided by Stremio
 */
const getItems = async (type: "movie" | "series" | string, id: string) => {
  try {
    const api_result = await get(type, id);

    if (!api_result) throw new NZBFetchGetError("No results");

    return api_result.channel.item.map((item) => parse_api_result(item, id));
  } catch (error) {
    console.error(error);
  }
};

const limit = (
  items: ReturnType<typeof parse_api_result>[],
  opts: {
    limit_per_quality: number;
    limit_qualities: (keyof typeof Qualities)[];
    limit_languages: string[];
  } = {
    limit_per_quality: 2,
    limit_qualities: ["4k"],
    limit_languages: [],
  }
) => {
  const qualitiesFilter = (item: (typeof items)[0]) => {
    return opts.limit_qualities.map((limited_quality) => {
      return Qualities[limited_quality].some((q) => {
        return item.quality?.includes(q);
      });
    });
  };

  const filtered = items.filter(qualitiesFilter);
  return filtered;
};

export const newznab = {
  get,
  getItems,

  limit,
};
