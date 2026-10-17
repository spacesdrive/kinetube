import { ConflictError } from './errors.ts';

export interface KeyedLock {
  // throws ConflictError with the given message when the key is already held
  claim(key: string, busyMessage: string): void;
  release(key: string): void;
  isHeld(key: string): boolean;
}

// one install or model download per key at a time; a second request is answered with 409
export function createKeyedLock(): KeyedLock {
  const heldKeys = new Set<string>();

  return {
    claim(key, busyMessage) {
      if (heldKeys.has(key)) throw new ConflictError(busyMessage);
      heldKeys.add(key);
    },
    release: (key) => {
      heldKeys.delete(key);
    },
    isHeld: (key) => heldKeys.has(key),
  };
}
