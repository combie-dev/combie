import { Store } from "../storage/store.ts";
import { alreadyInitialized } from "./errors.ts";

export interface InitResult {
  created: boolean;
  path: string;
  message: string;
}

/**
 * Initialize local Combie state. Idempotent and safe to re-run.
 */
export function initCombie(baseDir: string): InitResult {
  const store = new Store(baseDir);
  try {
    if (store.isInitialized()) {
      // Still ensure schema is present; do not corrupt state.
      store.init();
      return {
        created: false,
        path: store.stateDir,
        message: alreadyInitialized().message,
      };
    }
    store.init();
    return {
      created: true,
      path: store.stateDir,
      message: `Initialized Combie at ${store.stateDir}`,
    };
  } finally {
    store.close();
  }
}
