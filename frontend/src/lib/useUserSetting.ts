import { useState, useCallback } from "react";

type Updater<T> = T | ((prev: T) => T);

export function useUserSetting<T>(key: string, defaultValue: T): [T, (value: Updater<T>) => void] {
  const storageKey = `dana-os:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (next: Updater<T>) => {
      setValue((current) => {
        const nextValue = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextValue));
        } catch { /* empty */ }
        return nextValue;
      });
    },
    [storageKey],
  );

  return [value, set];
}
