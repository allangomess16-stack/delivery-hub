import fs from "node:fs";
import path from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";

const caminho = path.join(
  process.cwd(),
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);

if (!fs.existsSync(caminho)) {
  console.error(`[ERRO] AndroidManifest.xml nao encontrado: ${caminho}`);
  process.exit(1);
}

const xml = fs.readFileSync(caminho, "utf8");
const validacao = XMLValidator.validate(xml);
if (validacao !== true) {
  const detalhe = validacao?.err
    ? `linha ${validacao.err.line}, coluna ${validacao.err.col}: ${validacao.err.msg}`
    : "erro XML desconhecido";
  console.error(`[ERRO] AndroidManifest.xml invalido (${detalhe}).`);
  process.exit(1);
}

const manifest = new XMLParser({ ignoreAttributes: false }).parse(xml)?.manifest;
if (!manifest?.application || !manifest.application.activity) {
  console.error("[ERRO] AndroidManifest.xml nao contem application/activity.");
  process.exit(1);
}

console.log("[OK] AndroidManifest.xml validado antes do Gradle.");
