import { useSyncExternalStore } from "react";
import type { ExtractKeys } from "../type";

type StoreSubscriber<T> = {
  getStore: () => T;
  subscribe: (cb: () => void) => () => boolean;
}

export class SyncState {
  static doSync = <T>({ getStore, subscribe }: StoreSubscriber<T>, name?: ExtractKeys<T> | string): any => {
    const notationSnapshot = () => {
      if (!name) return getStore()
      const store = getStore() as Record<string, unknown>
      return store[name]
    }

    return useSyncExternalStore(subscribe, notationSnapshot, notationSnapshot);
  }
}
