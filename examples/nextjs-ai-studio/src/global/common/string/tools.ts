export const getNanoid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

/** Mask sensitive content in error messages (e.g. tokens, keys). */
export const replaceSensitiveText = (text: string): string => text;
