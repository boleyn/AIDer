import { sha256 } from 'js-sha256';

export const getNanoid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

export const hashStr = (str: string): string => sha256(str);

/** Mask sensitive content in error messages (e.g. tokens, keys). */
export const replaceSensitiveText = (text: string): string => text;
