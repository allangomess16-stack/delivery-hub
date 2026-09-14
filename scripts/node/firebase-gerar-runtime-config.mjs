import fs from "node:fs";

const [entrada, saida, projectId, databaseInstance, databaseURL] =
  process.argv.slice(2);

if (!entrada || !saida || !projectId || !databaseInstance || !databaseURL) {
  console.error("Uso: node firebase-gerar-runtime-config.mjs <entrada> <saida> <projectId> <instance> <databaseURL>");
  process.exit(2);
}

const bruto = JSON.parse(fs.readFileSync(entrada, "utf8"));

function tentarParseString(valor) {
  if (typeof valor !== "string") return valor;
  const inicio = valor.indexOf("{");
  const fim = valor.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return valor;
  try {
    return JSON.parse(valor.slice(inicio, fim + 1));
  } catch {
    return valor;
  }
}

function buscarConfig(valor) {
  valor = tentarParseString(valor);
  if (!valor || typeof valor !== "object") return null;

  if (
    typeof valor.apiKey === "string" &&
    typeof valor.appId === "string" &&
    typeof valor.projectId === "string"
  ) {
    return valor;
  }

  for (const filho of Object.values(valor)) {
    const encontrado = buscarConfig(filho);
    if (encontrado) return encontrado;
  }
  return null;
}

const firebase = buscarConfig(bruto);
if (!firebase) {
  console.error("Nao foi possivel localizar sdkConfig no retorno da CLI.");
  process.exit(1);
}

firebase.databaseURL = databaseURL;

const runtime = {
  habilitado: true,
  projectId,
  databaseURL,
  databaseInstance,
  firebase,
};

fs.mkdirSync(new URL("../../public/", import.meta.url), { recursive: true });
fs.writeFileSync(saida, JSON.stringify(runtime, null, 2) + "\n", "utf8");
console.log(`Config Firebase gerada: ${saida}`);
