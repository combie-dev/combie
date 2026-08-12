import packageJson from "../../package.json";

declare const BUN_BINARY_NAME: string | undefined;
declare const BUN_BUILD_VERSION: string | undefined;

export const BINARY_NAME =
  typeof BUN_BINARY_NAME !== "undefined" ? BUN_BINARY_NAME : "bun run combie";

export const VERSION =
  typeof BUN_BUILD_VERSION !== "undefined"
    ? BUN_BUILD_VERSION
    : packageJson.version;
