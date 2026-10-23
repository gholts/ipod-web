async function readJSON(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok)
    throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}

// Load both regions once. Switching never depends on a fresh network request.
const [us, jp, japaneseStrings] = await Promise.all([
  readJSON("./data/us.json"),
  readJSON("./data/jp.json"),
  readJSON("./locales/ja.json"),
]);

export const catalogs = { us, jp };
export { japaneseStrings };
