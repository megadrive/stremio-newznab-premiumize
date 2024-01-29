import { type Manifest, addonBuilder } from "stremio-addon-sdk";
import {
  NewznabAPIResponse,
  generate_newznab_api_url,
} from "./providers/newznab";
import { parse_container_title } from "./util/parseContainerTitles";
import { filesize } from "filesize";

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

type AddonItem = ReturnType<typeof parse_container_title> & {
  url: string;
  size: string;
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

  const items = newznab_api_result.channel.item
    .map<AddonItem[]>((item) => {
      return {
        ...parse_container_title(item.title),
        url: item.enclosure["@attributes"].url,
        size: filesize(+item.enclosure["@attributes"].length),
      };
    })
    .filter((item) => item.title)
    // test one result per quality
    .reduce<ReturnType<typeof parse_container_title>[]>(
      (acc, curr, index, arr) => {
        if (arr.find((v) => v.quality !== curr.quality)) acc.push(curr);
        return acc;
      },
      []
    );

  console.log(items);

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
