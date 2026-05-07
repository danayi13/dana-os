import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

interface SheetUrls {
  habits: string | null;
  vocal: string | null;
  climbing: string | null;
}

export function useSheetUrls() {
  return useQuery<SheetUrls>({
    queryKey: ["config", "sheet-urls"],
    queryFn: () => api.get("/config/sheet-urls"),
    staleTime: Infinity,
  });
}
