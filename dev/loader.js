// Development-only helper: loads the TypeScript sources straight from disk in a browser (no Node needed),
// transpiling each file on the fly with the TypeScript compiler loaded from a CDN.

export function createLoader(ts, shims = {}) {
    const cache = new Map();

    function resolve(from, spec) {
        const base = from.split("/").slice(0, -1);
        for (const part of spec.split("/")) {
            if (part === "." || part === "") {
                continue;
            }
            if (part === "..") {
                base.pop();
            } else {
                base.push(part);
            }
        }
        return base.join("/") + ".ts";
    }

    // Style imports (import "../style/visual.less") are handled by the page, not by the loader.
    const isAsset = (spec) => /\.(less|css)$/.test(spec);

    async function load(path) {
        if (cache.has(path)) {
            return cache.get(path).exports;
        }
        const response = await fetch("/" + path + "?t=" + Date.now());
        if (!response.ok) {
            throw new Error("Cannot load " + path + " (" + response.status + ")");
        }
        const source = await response.text();
        const js = ts.transpileModule(source, {
            fileName: path,
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText;

        const mod = { exports: {} };
        cache.set(path, mod);

        const specs = [...js.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);
        for (const spec of specs) {
            if (isAsset(spec)) {
                continue;
            }
            if (spec.startsWith(".")) {
                await load(resolve(path, spec));
            } else if (!(spec in shims)) {
                throw new Error(path + " needs the package \"" + spec + "\", which the dev harness does not provide");
            }
        }
        const require = (spec) => {
            if (isAsset(spec)) {
                return {};
            }
            return spec.startsWith(".") ? cache.get(resolve(path, spec)).exports : shims[spec];
        };
        new Function("exports", "module", "require", js + "\n//# sourceURL=" + path)(mod.exports, mod, require);
        return mod.exports;
    }

    return { load };
}
