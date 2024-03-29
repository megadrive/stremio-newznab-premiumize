import { env } from "../env";
import { ParsedStremioID, regex_exec } from "../util";
import { CinemetaError, cinemeta } from "./cinemeta";
import { filesize } from "filesize";
import { parse as parse_release_title } from "parse-release-title";

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
  movies: `${env.NEWZNAB_API_BASEURL}/api?t={type}&imdbid={id}&limit=50&o=json&apikey={apikey}`,
  search: `${env.NEWZNAB_API_BASEURL}/api?t=search&q={name}%20S{season}%20E{episode}&cat=5000&limit=50&extended=1&o=json&apikey={apikey}`,
};

const generate_api_url = async (
  type: "movie" | "series" | string,
  id: ParsedStremioID,
  apikey: string
) => {
  let url: string | undefined = undefined;

  if (type === "movie") {
    url = Newznab_URLs.movies
      .replace(/\{type\}/g, type)
      .replace(/\{id\}/g, id.id.replace(/[^0-9]+/g, ""));
  }

  if (type === "series") {
    try {
      const meta = await cinemeta.get(type, id.id);
      const name = (meta.name as string).replace(/'/g, "");
      const season =
        id.season && id.season < 10 ? "0" + id.season : `${id.season}`;
      const episode =
        id.episode && id.episode < 10 ? "0" + id.episode : `${id.episode}`;
      url = Newznab_URLs.search
        .replace(/\{name\}/g, name)
        .replace(/\{season\}/g, season)
        .replace(/\{episode\}/g, episode);
    } catch (error) {
      console.log(error);
    }
  }

  url = url ? url.replace(/\{apikey\}/, apikey) : url;

  console.log(`Generated URL: ${url ?? "something happened and it broke rip"}`);
  return url;
};

const fetch_headers = {
  "Cache-Control": "maxage=3600, stale-while-revalidate",
};

/**
 * Parses the title for information
 */
const parse_api_result = (
  item: NewznabAPIItem,
  imdb_id: string
): {
  imdb_id: string;
  title: string;
  quality?: string;
  size: string;
  url: string;
} => {
  const title = item.title;
  const parsed = parse_release_title(title);
  const quality = parsed.resolution;
  const url = item.link;
  const size = filesize(+item.enclosure["@attributes"].length);

  return {
    imdb_id,
    title,
    quality,
    size,
    url,
  };
};

/**
 * Gets a set of results based on an IMDB ID
 * @param type Type provided by Stremio
 * @param id IMDB ID provided by Stremio
 */
const get = async (
  type: "movie" | "series" | string,
  id: ParsedStremioID,
  apikey: string
) => {
  try {
    const url = await generate_api_url(type, id, apikey);
    console.log(`Fetching ${url}`);
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
const getItems = async (
  type: "movie" | "series" | string,
  id: ParsedStremioID,
  apikey: string
) => {
  try {
    const api_result = await get(type, id, apikey);

    if (!api_result) throw new NZBFetchGetError("No results");
    if (api_result.channel.item?.length === 0)
      throw new NZBFetchGetError("No results");

    return api_result.channel.item.map((item) => parse_api_result(item, id.id));
  } catch (error) {
    console.error(error);
  }
};

const limit = (
  items: ReturnType<typeof parse_api_result>[],
  opts: {
    limit_per_quality: number;
    limit_qualities: string[];
    limit_languages: string[];
  } = {
    limit_per_quality: 2,
    limit_qualities: ["4k"],
    limit_languages: [],
  }
) => {
  return items;
};

export const newznab = {
  get,
  getItems,

  limit,
};
