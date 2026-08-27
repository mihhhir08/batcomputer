// Lets plain `node` run the test files against extensionless TypeScript
// imports, so the source can use the conventional form that bundlers expect
// and nothing unusual sits in the deployment path.
//
//   node --import ./tests/resolve.mjs tests/mission.test.ts

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL?.startsWith("file:")) {
      const base = dirname(fileURLToPath(context.parentURL));
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        const candidate = resolvePath(base, specifier + ext);
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
