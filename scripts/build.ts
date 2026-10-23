import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const project = new URL("../", import.meta.url);

export async function build(): Promise<void> {
  const source = new URL("src/", project);
  const output = new URL("dist/", project);
  const files = [...new Bun.Glob("**/*").scanSync(fileURLToPath(source))]
    .filter(
      (path) =>
        !path.endsWith(".d.ts") &&
        (!path.startsWith("vendor/") || path === "vendor/ipod.ts"),
    )
    .sort();
  const bundle = await Bun.build({
    entrypoints: [fileURLToPath(new URL("vendor/ipod.ts", source))],
    external: [fileURLToPath(new URL("data.js", source))],
    target: "browser",
    minify: true,
  });
  if (!bundle.success)
    throw new AggregateError(bundle.logs, "iPod build failed");
  const transpiler = new Bun.Transpiler({ loader: "ts", target: "browser" });
  const worker = transpiler.transformSync(
    await readFile(new URL("service-worker.ts", import.meta.url), "utf8"),
  );
  const hash = createHash("sha256").update(worker);
  const emittedFiles: string[] = [];

  await rm(output, { recursive: true, force: true });
  for (const path of files) {
    let bytes =
      path === "vendor/ipod.ts"
        ? Buffer.from(await bundle.outputs[0].arrayBuffer())
        : await readFile(new URL(path, source));
    if (path.endsWith(".ts") && path !== "vendor/ipod.ts") {
      bytes = Buffer.from(transpiler.transformSync(bytes.toString()));
      if (!bytes.length) continue;
    }
    if (path.endsWith(".json")) {
      bytes = Buffer.from(JSON.stringify(JSON.parse(bytes.toString())));
    }
    const emittedPath = path.replace(/\.ts$/, ".js");
    const destination = new URL(emittedPath, output);
    await mkdir(new URL("./", destination), { recursive: true });
    await writeFile(destination, bytes);
    emittedFiles.push(emittedPath);
    hash.update(emittedPath).update(bytes);
  }
  const version = hash.digest("hex").slice(0, 16);
  const cachedFiles = ["./", ...emittedFiles.map((path) => `./${path}`)];
  await writeFile(
    new URL("sw.js", output),
    worker
      .replace("__BUILD_VERSION__", JSON.stringify(version))
      .replace("__PRECACHE_FILES__", JSON.stringify(cachedFiles, null, 2)),
  );
  console.log(`Built dist/ · ${emittedFiles.length} files · ${version}`);
}

if (import.meta.main) await build();
