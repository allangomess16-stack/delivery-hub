import fs from "node:fs";

const arquivo = process.argv[2];
if (!arquivo) process.exit(2);

const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));

function buscar(valor) {
  if (!valor || typeof valor !== "object") return null;

  if (typeof valor.appId === "string" && valor.appId) return valor.appId;

  for (const filho of Object.values(valor)) {
    const encontrado = buscar(filho);
    if (encontrado) return encontrado;
  }
  return null;
}

const appId = buscar(dados);
if (!appId) process.exit(1);
process.stdout.write(appId);
