const fs = require("fs");

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

fs.mkdirSync("dist/server", { recursive: true });
fs.mkdirSync("dist/.openai", { recursive: true });
fs.writeFileSync("dist/server/index.js", worker);
fs.copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
