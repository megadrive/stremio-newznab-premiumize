#!/usr/bin/env node

import expressApp from "./addon";
import { env } from "./env";
expressApp.listen(env.PORT, () => {
  console.log(
    `HTTP addon accessible at: http://127.0.0.1:${env.PORT}/manifest.json`
  );
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
