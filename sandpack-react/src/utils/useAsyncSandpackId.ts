import type { SandpackBundlerFiles } from "@codesandbox/sandpack-client";
import { useId as useReactId } from "react";

import { generateRandomId } from "./stringUtils";

export const useSandpackId = () => {
  if (typeof useReactId === "function") {
    /* eslint-disable-next-line */
    return useReactId();
  } else {
    return generateRandomId();
  }
};

/**
 * This is a hard constraint to make URLs shorter.
 * For example, this id will be used to mount SW in the iframe
 * so, to keep the URL valid, this must be an 9 character long string
 */
const MAX_ID_LENGTH = 9;

const sandpackClientVersion = process.env.SANDPACK_CLIENT_VERSION;

export const useAsyncSandpackId = (files: SandpackBundlerFiles) => {
  if (typeof useReactId === "function") {
    /* eslint-disable-next-line react-hooks/rules-of-hooks */
    const reactDomId = useReactId();
    return async () => {
      try {
        const allCode = Object.entries(files)
          .map((path, code) => path + "|" + code)
          .join("|||");
        const sha = await generateShortId(
          allCode + reactDomId + sandpackClientVersion
        );

        return ensureLength(
          sha.replace(/:/g, "sp").replace(/[^a-zA-Z]/g, ""),
          MAX_ID_LENGTH
        );
      } catch (error) {
        // Fallback to random ID if generateShortId fails
        return ensureLength(generateRandomId(), MAX_ID_LENGTH);
      }
    };
  } else {
    return () => ensureLength(generateRandomId(), MAX_ID_LENGTH);
  }
};

function ensureLength(str: string, length: number) {
  if (str.length > length) {
    return str.slice(0, length);
  } else {
    return str.padEnd(length, "s");
  }
}

async function generateShortId(input: string): Promise<string> {
  // Fallback hash function
  const fallbackHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to base64-like string
    const hashStr = Math.abs(hash).toString(36);
    return btoa(hashStr + str.slice(0, 10)).slice(0, 44);
  };

  // Check if crypto.subtle is available (requires HTTPS or localhost)
  // More strict check: verify crypto, crypto.subtle, and crypto.subtle.digest all exist
  if (
    typeof crypto === "undefined" ||
    !crypto.subtle ||
    typeof crypto.subtle.digest !== "function"
  ) {
    return fallbackHash(input);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    // Double-check crypto.subtle is still available before calling
    if (!crypto.subtle || typeof crypto.subtle.digest !== "function") {
      return fallbackHash(input);
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return btoa(String.fromCharCode(...hashArray));
  } catch (error) {
    // Fallback if digest fails (e.g., in non-secure contexts)
    return fallbackHash(input);
  }
}
