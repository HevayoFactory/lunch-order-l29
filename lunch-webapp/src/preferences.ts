import { useCallback, useState } from "react";

const KEY = "lunch.showDescriptions";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** The Settings screen's one preference, kept in this browser only. */
export function useShowDescriptions(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(read);
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    setValue(next);
  }, []);
  return [value, set];
}
