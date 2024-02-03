import { type Manifest, addonBuilder } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
import { env } from "./env";
import { parse_imdb_id } from "./util";

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest: Manifest & {
  config?: {
    key: string;
    type: "text" | "number" | "password" | "checkbox";
    default?: string | boolean;
    options?: string[];
    required?: boolean;
  }[];
  behaviorHints: {
    configurable: boolean;
    configurationRequired: boolean;
  };
} = {
  id: "community.stremionewznabpremiumize",
  version: "0.0.1",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  name: "Newznab Premiumize",
  description: "Gets NZBs from a Newznab API and serves it to Premiumize.",
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    configurationRequired: true,
  },
  config: [
    {
      key: "premiumize_api_key",
      type: "password",
    },
    {
      key: "newznab_api_key",
      type: "password",
    },
    { key: "newznab_api_path", type: "text", default: env.NEWZNAB_API_BASEURL },
  ],
};
const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);
  const parsed_id = parse_imdb_id(id);

  const newznab_api_result = await newznab.getItems(type, parsed_id);

  if (!newznab_api_result) return Promise.resolve({ streams: [] });

  // parse down the streams to x per result
  const limited_results = newznab.limit(newznab_api_result);
  if (limited_results.length === 0) {
    return Promise.resolve({ streams: [] });
  }

  return {
    streams: limited_results.map((result) => ({
      name: `NZB2PM\n${result.quality}`,
      title: result.title,
      url: `${env.BASE_URL}/premiumize/${Math.random() * 102312}`,
    })),
  };
});

export default builder.getInterface();
