import { env } from "./env";
import express from "express";
import cors from "cors";
import { type Manifest } from "stremio-addon-sdk";
import { newznab } from "./providers/newznab";
import { parse_imdb_id, user_settings } from "./util";
import { join } from "path";

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

  return res.json({
    streams: limited_results.map((result) => ({
      name: `NZB2PM\n${result.quality}`,
      title: result.title,
      url: `${env.BASE_URL}/p/${encodeURIComponent(result.url)}`,
    })),
  });
});

app.get("/p/:url", async (req, res) => {
  const url = decodeURIComponent(req.params.url).replace(/&amp;/g, "&");
  console.log(`Creating a transfer for ${url}`); // @TODO: remove apikeys from console logs
  const body = new URLSearchParams();
  body.append("src", url);

  const response = await fetch(
    `${env.PREMIUMIZE_API_BASEURL}/transfer/create?apikey=${env.PREMIUMIZE_API_KEY}`,
    {
      method: "POST",
      body,
    }
  );
  if (response.ok) console.log("Premiumize accepted");

  // wait for transfer to complete. ~1 minute total
  let waiting = true;
  const check_file_availability = async () => {
    try {
      console.log(`Checking for file ${url}`);
      if (waiting) {
        const transfer_res = await fetch(
          `${env.PREMIUMIZE_API_BASEURL}/transfer/list?apikey=${env.PREMIUMIZE_API_KEY}`
        );
        if (!transfer_res.ok) {
          console.log(
            `${env.PREMIUMIZE_API_BASEURL}/transfer/list?apikey=${env.PREMIUMIZE_API_KEY}`
          );
          if (transfer_res.status === 404) console.log("404");
          return;
        }
        const transfer = (await transfer_res.json()) as {
          status: string;
          transfers: {
            id: string;
            name: string;
            status: string;
            progress: number;
            src: string;
            folder_id: string;
            file_id: string;
          }[];
        };
        console.log(transfer);
        const found = transfer.transfers.find((t) => t.src === url);
        if (found?.status === "finished") {
          const ddl_body = new URLSearchParams();
          ddl_body.append("src", url);
          const ddl = (await (
            await fetch(`${env.PREMIUMIZE_API_BASEURL}/transfer/directdl`, {
              method: "POST",
              body: ddl_body,
            })
          ).json()) as {
            status: string;
            location: string;
            filename: string;
            filesize: number;
            content: {
              path: string;
              size: number;
              link: string;
              stream_link: string;
              transcode_status: string;
            }[];
          };

          console.log(ddl);

          return res.status(200).sendFile(ddl.location);
        }
      }
    } catch (error) {
      console.log("Couldn't serve a transfer");
    }
  };
  const interval = setInterval(check_file_availability, 1000);
  setTimeout(() => {
    waiting = false;
    clearInterval(interval);
  }, 5 * 60 * 1000);
});

export default app;
