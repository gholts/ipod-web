import type { Catalog, Storefront } from "./types.js";

async function readJSON<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok)
    throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

// Load both regions once. Switching never depends on a fresh network request.
const [us, jp, japaneseStrings] = await Promise.all([
  readJSON<Catalog>("./data/us.json"),
  readJSON<Catalog>("./data/jp.json"),
  readJSON<Record<string, string>>("./locales/ja.json"),
]);

export const catalogs: Record<Storefront, Catalog> = { us, jp };
export { japaneseStrings };
