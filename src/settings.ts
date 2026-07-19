// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

/**
 * Single source of truth for the plugin's version, read straight from
 * package.json so the startup log line can never drift out of sync with
 * what's actually published (this used to be a hand-maintained string in
 * platform.ts and regularly fell out of date).
 */
export const PLUGIN_VERSION: string = pkg.version;
