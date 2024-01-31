import { type Manifest, addonBuilder } from "stremio-addon-sdk";
import { NewznabAPIResponse } from "./providers/newznab";
import { env } from "./env";

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest: Manifest = {
  id: "community.stremionewznabpremiumize",
  version: "0.0.1",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  name: "Newznab Premiumize",
  description: "Gets NZBs from a Newznab API and serves it to Premiumize.",
  idPrefixes: ["tt"],
};
const builder = new addonBuilder(manifest);

// https://api.nzbgeek.info/api?t=movie&imdbid=08009314&limit=50&o=json&apikey=MA801QWu9MffN6uJpzAEGiu4jD5zgRUH
const newznab_api = `${env.NEWZNAB_API_BASEURL}/api?t={type}&imdbid={id}&limit=50&o=json&apikey=${env.NEWZNAB_API_KEY}`;
const generate_newznab_api_url = (type: string, id: string) => {
  return newznab_api
    .replace(/\{type\}/g, type)
    .replace(/\{id\}/g, id.replace(/[^0-9]+/g, ""));
};

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);

  const newznab_api_result = (await (async () => {
    try {
      const url = generate_newznab_api_url(type, id);
      console.log(`fetching ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw Error("Couldn't fetch API result.");

      return await res.json();
    } catch (error) {
      console.error(error);
    }
  })()) as NewznabAPIResponse;

  console.log(newznab_api_result.item[0]);

  // Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
  if (type === "movie" && id === "tt1254207") {
    // serve one stream to big buck bunny
    const stream = {
      url: "http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_30fps_normal.mp4",
    };
    return Promise.resolve({ streams: [stream] });
  }

  // otherwise return no streams
  return Promise.resolve({ streams: [] });
});

export default builder.getInterface();
