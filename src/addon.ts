import { env } from "./env";
import express from "express";
import cors from "cors";
import { type Manifest } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
import { parse_imdb_id } from "./util";

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
  return res.send("Configuration page here");
});

app.get("/:settings/manifest.json", (req, res) => {
  const new_manifest = Object.assign({}, manifest);

  return res.json(manifest);
});

app.get("/:settings/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  console.log("request for streams: " + type + " " + id);
  const parsed_id = parse_imdb_id(id);

  const api_result = await newznab.getItems(type, parsed_id);

  if (!api_result) return { streams: [] };

  // parse down the streams to x per result
  const limited_results = newznab.limit(api_result);
  if (limited_results.length === 0) {
    return res.json({ streams: [] });
  }

  return res.json({
    streams: limited_results.map((result) => ({
      name: `NZB2PM\n${result.quality}`,
      title: result.title,
      url: `${env.BASE_URL}/premiumize/${Math.random() * 102312}`,
    })),
  });
});

export default app;
