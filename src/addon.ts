import { env } from "./env";
import express from "express";
import cors from "cors";
import { type Manifest } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
import { generate_filename, parse_imdb_id, user_settings } from "./util";
import { join } from "path";
import {
  PremiumizeAPI_TransferCreate,
  PremiumizeError,
} from "./providers/premiumize.types";
import { premiumize_api } from "./providers/premiumize";
import { parse as parse_torrent_title } from "parse-torrent-title";
import { cinemeta } from "./providers/cinemeta";
import { filesize } from "filesize";

const app = express();
app.use(cors());

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
  },
};

app.get("/", (req, res) => {
  return res.redirect("/configure");
});

app.get("/:settings?/configure", (req, res) => {
  if (req.params.settings) {
    const parsed_settings = user_settings.decode(req.params.settings);
    return res.redirect(
      `/configure?premiumize=${parsed_settings.premiumize}&newznab=${parsed_settings.newznab_key}`
    );
  }
  return res.sendFile(join(__dirname, "/static/index.html"));
});

app.get("/:settings/manifest.json", (req, res) => {
  return res.json(manifest);
});

type Stream = {
  name: string;
  description: string;
  url: string;
};
type Streams = {
  streams: Stream[];
};
app.get("/:settings/stream/:type/:id.json", async (req, res) => {
  const { type, id, settings } = req.params;
  const parsed_settings = user_settings.decode(settings);
  console.log("request for streams: " + type + " " + id);
  const parsed_id = parse_imdb_id(id);

  async function get_from_newznab(): Promise<Stream[]> {
    try {
      const api_result = await newznab.getItems(
        type,
        parsed_id,
        parsed_settings.newznab_key
      );

      if (!api_result) return [];

      // parse down the streams to x per result
      const limited_results = newznab.limit(api_result);
      if (limited_results.length === 0) {
        return [];
      }

      const results = limited_results.map((result) => {
        const quality = result.quality ?? "";

        return {
          name: `[PGeek DL]\n${quality}`,
          description: `${result.title}\n💾 ${result.size}`,
          url: `${env.BASE_URL}/nzb/${parsed_settings.premiumize}/${btoa(
            result.url
          )}`,
        };
      });

      return results;
    } catch (error) {
      console.log(error);
    }

    return [];
  }

  async function get_from_premiumize(): Promise<Stream[]> {
    const filename_to_find = await generate_filename(id);
    console.log(`checking premiumize store for ${id} / ${filename_to_find}`);

    const files = await premiumize_api.findFiles(
      filename_to_find,
      parsed_settings.premiumize
    );

    if (files.length === 0) {
      return [];
    }

    const streams = files.map((f) => {
      const info = parse_torrent_title(f.name);

      const result = {
        name: `[PGeek+]\n${info.resolution ?? ""}`,
        description: `${f.name}\n💾 ${filesize(f.size)}`,
        url: `${env.BASE_URL}/cached/${btoa(f.stream_link)}`,
      };

      return result;
    });

    return streams;
  }

  try {
    let streams: Stream[] = [];

    // prefer cached files
    try {
      const premiumize_results = await get_from_premiumize();
      streams = [...streams, ...premiumize_results];
    } catch (error) {
      console.log("couldn't get nzb results");
      console.error(error);
    }

    try {
      const newznab_results = await get_from_newznab();
      streams = [...streams, ...newznab_results];
    } catch (error) {
      console.log("couldn't get nzb results");
      console.error(error);
    }

    streams = streams.map((stream) => ({
      ...stream,
      proxyHeaders: {
        "Cache-Control": "max-age: 90, immutable",
      },
    }));

    return res.json({ streams: streams });
  } catch (error) {
    console.error(error);
    return res.status(500).send("errors occurred");
  }
});

app.get("/cached/:url", async (req, res) => {
  try {
    const url = decodeURIComponent(atob(req.params.url)).replace(/&amp;/g, "&");

    console.log(`Creating a transfer for ${url}`); // @TODO: remove apikeys from console logs

    console.log(`redirecting to ${url}`);
    return res.redirect(url);
  } catch (error) {
    console.error(error);
    return res.status(500).send("error occurred");
  }
});

app.get("/nzb/:premiumize/:url", async (req, res) => {
  const apikey = req.params.premiumize;
  const url = decodeURIComponent(atob(req.params.url)).replace(/&amp;/g, "&");

  console.log(`[get] ${req.url}`);

  try {
    console.log(`Creating a transfer for ${url}`); // @TODO: remove apikeys from console logs

    // create a transfer
    console.log("CREATE TRANSFER");
    const createTransfer = (await premiumize_api.createTransfer(
      url,
      apikey
    )) as PremiumizeAPI_TransferCreate;
    console.log({ createTransfer });

    // follow the transfer status
    console.log("WAIT FOR COMPLETION");
    let complete;
    try {
      complete = await premiumize_api.waitForTransferCompletion(
        createTransfer.name,
        apikey
      );
      if (complete) {
        console.log("TRANSFER COMPLETE");
      }
    } catch (error) {
      console.log(`couldnt follow transfer status`);
      console.log(error);
    }

    // once complete, do after-complete stuff
    if (!complete) throw new PremiumizeError("Not complete");

    console.log("GET MOVIE FILE");
    let file = await premiumize_api.getFile(complete.folder_id, apikey);
    if (!file) {
      console.log(`couldn't find a video file in ${complete.folder_id}`);
      return res.status(404).send("no file");
    }

    console.log(`Got file`, file);

    // serve the file babes
    if (!file) return res.status(404).send("");

    console.log(`redirecting to ${file.stream_link}`);
    return res.redirect(file.stream_link);
  } catch (error) {
    console.error(error);
    return res.status(500).send("error occurred");
  }
});

export default app;
