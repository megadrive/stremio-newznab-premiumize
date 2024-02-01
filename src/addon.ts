import { type Manifest, addonBuilder } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";

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

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);

  const newznab_api_result = await newznab.get(type, id);

  console.log(newznab_api_result?.item[0]);

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
