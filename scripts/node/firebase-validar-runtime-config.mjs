import fs from "node:fs";

const [arquivo] = process.argv.slice(2);

if (!arquivo) {
  console.error("[ERRO] Informe o caminho de firebase-config.json.");
  process.exit(2);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(arquivo, "utf8"));
} catch {
  console.error("[ERRO] firebase-config.json nao pode ser lido.");
  process.exit(1);
}

const camposValidos =
  config?.habilitado === true &&
  typeof config?.projectId === "string" &&
  typeof config?.databaseURL === "string" &&
  typeof config?.databaseInstance === "string" &&
  typeof config?.firebase?.apiKey === "string" &&
  typeof config?.firebase?.appId === "string";

if (!camposValidos) {
  console.error("[ERRO] Configuracao Firebase runtime incompleta ou desativada.");
  process.exit(1);
}

console.log("[OK] Configuracao Firebase runtime validada.");
