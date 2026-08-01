const fs = require("fs");
const path = require("path");

const html = fs.readFileSync("index.html", "utf8");
const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch() {
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-cache"
      }
    });
  }
};
`;

fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync("dist/server", { recursive: true });
fs.mkdirSync("dist/.openai", { recursive: true });
fs.writeFileSync("dist/server/index.js", worker);
fs.copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
fs.copyFileSync("index.html", "dist/index.html");
fs.cpSync("public", "dist", { recursive: true });

const expected = [
  "dist/index.html",
  "dist/downloads/vizentive-portfolio.pdf",
  "dist/portfolio/slides/slide-07.webp",
  "dist/portfolio/thumbnails/slide-24.webp"
];

for (const file of expected) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`Missing build asset: ${file}`);
  }
}
