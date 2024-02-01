import { env } from "../env";

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
  item: NewznabAPIItem[];
};

class CinemetaError extends Error {}
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
  let rv: string | undefined = undefined;
  if (type === "movie") {
    rv = Newznab_URLs.movies
      .replace(/\{type\}/g, type)
      .replace(/\{id\}/g, id.replace(/[^0-9]+/g, ""));
  }

  if (type === "series") {
    try {
      const res = await fetch(
        `https://v3-cinemeta.strem.io/meta/movie/${id}.json`
      );
      if (!res.ok) throw new CinemetaError("Couldn't fetch Cinemeta info.");
      const name = (await res.json()).meta.name as string;
      rv = Newznab_URLs.search.replace(/\{query\}/g, name);
    } catch (error) {
      console.log(error);
    }
  }

  console.log(`Generated URL: ${rv ?? ""}`);
  return rv;
};

const headers = {
  "Cache-Control": "maxage=3600, stale-while-revalidate",
};

export const newznab = {
  get: async (type: string, id: string) => {
    try {
      const url = await generate_api_url(type, id);
      if (!url) throw new NZBFetchGetError("Couldn't generate Newznab URL.");

      const res = await fetch(url, {
        headers,
        method: "GET",
      });
      if (!res.ok) throw new NZBFetchGetError();

      const json = await res.json();
      return json as NewznabAPIResponse;
    } catch (error) {
      console.error(error);
    }
  },
};
