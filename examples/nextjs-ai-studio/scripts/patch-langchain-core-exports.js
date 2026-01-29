const fs = require("fs");
const path = require("path");

const pkgPath = path.join(
  process.cwd(),
  "node_modules",
  "@langchain",
  "core",
  "package.json"
);

if (!fs.existsSync(pkgPath)) {
  process.exit(0);
}

const raw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const exportsField = pkg.exports ?? {};

if (exportsField["./utils/context"]) {
  process.exit(0);
}

exportsField["./utils/context"] = {
  input: "./src/utils/context.ts",
  require: {
    types: "./dist/utils/context.d.cts",
    default: "./dist/utils/context.cjs",
  },
  import: {
    types: "./dist/utils/context.d.ts",
    default: "./dist/utils/context.js",
  },
};

pkg.exports = exportsField;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
