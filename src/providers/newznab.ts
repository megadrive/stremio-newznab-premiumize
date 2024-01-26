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
