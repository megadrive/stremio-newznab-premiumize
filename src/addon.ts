import { type Manifest, addonBuilder } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
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

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);

  const newznab_api_result = await newznab.getItems(type, id);

  if (!newznab_api_result) return Promise.resolve({ streams: [] });

  // parse down the streams to x per result
  const limited_results = newznab.limit(newznab_api_result);
  console.log(limited_results);
  if (limited_results.length === 0) {
    return Promise.resolve({ streams: [] });
  }

  return {
    streams: limited_results.map((result) => ({
      name: "NZB2PM",
      title: result.title,
      url: `${env.BASE_URL}/premiumize/${Math.random() * 102312}`,
    })),
  };
});

export default builder.getInterface();
