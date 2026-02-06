// Compatibility shims for openai-node SDK type changes.
// Keep these narrow and centralized to reduce merge conflicts.

import 'openai';

declare module 'openai' {
  interface ClientOptions {
    httpAgent?: any;
  }
}

export {};
