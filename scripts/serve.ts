import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { build, project } from "./build.js";

const preview = process.argv.includes("--preview");
if (!preview) await build();
const root = resolve(fileURLToPath(new URL("dist/", project)));

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.IPOD_PORT || 4173),
  async fetch(request) {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, { status: 405 });
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response(null, { status: 400 });
    }
    const path = resolve(
      root,
      `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`,
    );
    if (!path.startsWith(root + sep))
      return new Response(null, { status: 403 });
    const file = Bun.file(path);
    if (!(await file.exists()))
      return new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : file, {
      headers: { "Content-Type": file.type, "Cache-Control": "no-cache" },
    });
  },
});

if (!preview) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(console.error), 80);
  };
  watch(new URL("src/", project), { recursive: true }, rebuild);
  watch(new URL("./service-worker.ts", import.meta.url), rebuild);
}
console.log(
  `${server.url} · ${preview ? "preview" : "edit src/, then refresh"}`,
);
