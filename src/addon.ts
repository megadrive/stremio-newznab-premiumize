import { env } from "./env";
import express from "express";
import cors from "cors";
import { type Manifest } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
import { parse_imdb_id, user_settings } from "./util";
import { join } from "path";
import {
  PremiumizeAPI_TransferCreate,
  premiumize_api,
  type PremiumizeAPI_DirectDL,
  type PremiumizeAPI_TransferList,
} from "./providers/premiumize";

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

app.get("/configure", (req, res) => {
  return res.sendFile(join(__dirname, "/static/index.html"));
});

app.get("/:settings/manifest.json", (req, res) => {
  return res.json(manifest);
});

app.get("/:settings/stream/:type/:id.json", async (req, res) => {
  const { type, id, settings } = req.params;
  const parsed_settings = user_settings.decode(settings);
  console.log("request for streams: " + type + " " + id);
  const parsed_id = parse_imdb_id(id);

  const api_result = await newznab.getItems(
    type,
    parsed_id,
    parsed_settings.newznab_key
  );

  if (!api_result) return { streams: [] };

  // parse down the streams to x per result
  const limited_results = newznab.limit(api_result);
  if (limited_results.length === 0) {
    return res.json({ streams: [] });
  }

  const results = {
    streams: limited_results.map((result) => ({
      name: `NZB2PM\n${result.quality}`,
      title: result.title,
      description: `💾 ${result.size}`,
      url: `${env.BASE_URL}/p/${parsed_settings.premiumize}/${btoa(
        result.url
      )}`,
    })),
  };
  console.log(results);
  return res.json(results);
});

app.get("/p/:premiumize/:url", async (req, res) => {
  const apikey = req.params.premiumize;
  const url = decodeURIComponent(atob(req.params.url)).replace(/&amp;/g, "&");

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
  try {
    const complete = await premiumize_api.waitForTransferCompletion(
      createTransfer.name,
      apikey
    );
    console.log("all g");
  } catch (error) {
    console.log(`couldnt follow transfer status`);
    console.log(error);
  }

  // once complete, do after-complete stuff
  console.log("MOVE TRANSFER");
  const file = await premiumize_api.moveTransferAfterCompletion(
    createTransfer.name,
    apikey
  );

  // serve the file babes
  return res.redirect(file.stream_link);
});

export default app;
