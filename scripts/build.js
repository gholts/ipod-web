import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const project = new URL("../", import.meta.url);

export async function build() {
  const source = new URL("src/", project);
  const output = new URL("dist/", project);
  const files = [...new Bun.Glob("**/*").scanSync(fileURLToPath(source))].sort();
  const worker = await readFile(
    new URL("service-worker.js", import.meta.url),
    "utf8",
  );
  const hash = createHash("sha256").update(worker);

  await rm(output, { recursive: true, force: true });
  for (const path of files) {
    let bytes = await readFile(new URL(path, source));
    if (path.endsWith(".json")) {
      bytes = Buffer.from(JSON.stringify(JSON.parse(bytes)));
    }
    const destination = new URL(path, output);
    await mkdir(new URL("./", destination), { recursive: true });
    await writeFile(destination, bytes);
    hash.update(path).update(bytes);
  }
  const version = hash.digest("hex").slice(0, 16);
  const cachedFiles = ["./", ...files.map((path) => `./${path}`)];
  await writeFile(
    new URL("sw.js", output),
    worker
      .replace("__BUILD_VERSION__", JSON.stringify(version))
      .replace("__PRECACHE_FILES__", JSON.stringify(cachedFiles, null, 2)),
  );
  console.log(`Built dist/ · ${files.length} files · ${version}`);
}

if (import.meta.main) await build();
