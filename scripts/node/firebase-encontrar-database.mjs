import fs from "node:fs";

const arquivo = process.argv[2];
if (!arquivo) process.exit(2);

const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));

function normalizarUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

function buscar(valor) {
  if (!valor || typeof valor !== "object") return null;

  if (typeof valor.databaseUrl === "string" && valor.databaseUrl) {
    const partes = typeof valor.name === "string" ? valor.name.split("/") : [];
    const instance = partes.at(-1) || valor.instance || valor.instanceId || "";
    return {
      instance,
      url: normalizarUrl(valor.databaseUrl),
    };
  }

  if (typeof valor.instance === "string" && valor.instance) {
    return {
      instance: valor.instance,
      url: normalizarUrl(valor.databaseUrl || valor.url || ""),
    };
  }

  for (const filho of Object.values(valor)) {
    const encontrado = buscar(filho);
    if (encontrado?.instance) return encontrado;
  }

  return null;
}

const encontrado = buscar(dados);
if (!encontrado?.instance) process.exit(1);

process.stdout.write(`DATABASE_INSTANCE=${encontrado.instance}\n`);
if (encontrado.url) process.stdout.write(`DATABASE_URL=${encontrado.url}\n`);
