// Font registration and diagnostic logging.
// Preserve original initialization barrier: catalogs load before device state.
import "../data.js";
const chicagoFontUrl = new URL("../assets/chicago.woff2", import.meta.url).href;
function defaultDebugEnabled() {
  return false;
}
function debugEnabled(e: string) {
  try {
    const t = localStorage.getItem("onyxLog");
    if (t === null) return defaultDebugEnabled();
    const i = t.split(",").map((a) => a.trim()),
      l = i.find((a) => a.split("=")[0] === e);
    return l !== void 0
      ? l.split("=")[1] !== "off"
      : i.some((a) => a === "*" || a === "*=*");
  } catch {
    return defaultDebugEnabled();
  }
}
function createLogger(e: string) {
  const t = `[${e}]`;
  return {
    debug: (...i: unknown[]) => {
      if (debugEnabled(e)) {
        console.log(t, ...i);
      }
    },
    info: (...i: unknown[]) => console.info(t, ...i),
    warn: (...i: unknown[]) => console.warn(t, ...i),
    error: (...i: unknown[]) => console.error(t, ...i),
  };
}
const fontLogger = createLogger("fonts"),
  fontFaces: {
    family: string;
    source: string;
    descriptors: FontFaceDescriptors & {
      sizeAdjust?: string;
      ascentOverride?: string;
      descentOverride?: string;
    };
  }[] = [
    {
      family: "ChicagoKare",
      source: `url(${chicagoFontUrl}) format('woff2')`,
      descriptors: {
        display: "block",
      },
    },
    {
      // Installed with macOS, reads as Chicago, and covers Thai. The metric
      // overrides line its glyphs up with ChicagoKare's so falling back does
      // not shift the layout.
      family: "Krungthep",
      source: 'local("Krungthep")',
      descriptors: {
        display: "block",
        sizeAdjust: "79.5%",
        ascentOverride: "94.1%",
        descentOverride: "27.7%",
      },
    },
  ];
let fontsRegistered = false;
function registerFonts() {
  if (!(fontsRegistered || typeof document > "u" || !document.fonts)) {
    fontsRegistered = true;
    for (const { family, source, descriptors } of fontFaces)
      try {
        const l = new FontFace(family, source, descriptors);
        document.fonts.add(l);
        l.load().catch((a) => {
          fontLogger.warn(`Could not load ${family}`, a);
        });
      } catch (error) {
        fontLogger.warn(`Could not register ${family}`, error);
      }
  }
}
const baseStyles =
  ":host,:root{box-sizing:border-box;font-family:ChicagoKare,Krungthep,system-ui,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%}:host{display:block;container-type:inline-size;container-name:ipod}*,*:before,*:after{box-sizing:inherit}*{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}ul,ol,li,dl,dt,dd,h1,h2,h3,h4,h5,h6,p,blockquote,figure,button{margin:0;padding:0}ul,ol{list-style-type:none}pre,code,address,caption,figcaption{font-size:1em;font-weight:400;font-style:normal}button{background:none;border:0;color:inherit;cursor:pointer;font:inherit;line-height:inherit;vertical-align:inherit}button:disabled{cursor:default}svg{pointer-events:none}";
export { baseStyles, createLogger, registerFonts };
