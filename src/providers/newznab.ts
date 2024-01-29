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

// https://api.nzbgeek.info/api?t=movie&imdbid=08009314&limit=50&o=json&apikey=MA801QWu9MffN6uJpzAEGiu4jD5zgRUH
const newznab_api = `${process.env.NEWZNAB_API_BASEURL}/api?t={type}&imdbid={id}&limit=50&o=json&apikey=${process.env.NEWZNAB_API_KEY}`;
export const generate_newznab_api_url = (type: string, id: string) => {
  return newznab_api
    .replace(/\{type\}/g, type)
    .replace(/\{id\}/g, id.replace(/[^0-9]+/g, ""));
};
