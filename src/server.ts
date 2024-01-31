#!/usr/bin/env node

import { serveHTTP, publishToCentral } from "stremio-addon-sdk";
import addonInterface from "./addon";
import { env } from "./env";
serveHTTP(addonInterface, {
  port: env.PORT,
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
