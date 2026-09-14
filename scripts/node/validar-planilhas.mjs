import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const arquivos = process.argv.slice(2);

if (!arquivos.length) {
  console.log("Uso: npm run planilhas:validar -- caminho1.xlsx caminho2.xlsx");
  process.exit(1);
}

const regras = [
  ["ANJUN", /^AJ\d{14,15}$/i],
  ["JNT", /^99988\d{10}$/],
  ["JNT", /^888[01]\d{11}$/],
  ["IMILE", /^332\d{10}$/],
  ["IMILE", /^608\d{10}$/],
];

function normalizar(valor) {
  if (typeof valor === "number" && Number.isSafeInteger(valor)) return String(valor);
  const texto = String(valor ?? "").trim().replace(/^`+/, "").toUpperCase();
  const tn = texto.match(/TN[^A-Z0-9]*([A-Z0-9-]{8,})/i)?.[1];
  if (tn) return tn;
  const anjun = texto.match(/AJ\d{14,15}/i)?.[0];
  return anjun ?? texto;
}

function cabecalhoDeNumeracao(valor, coluna) {
  if (coluna !== 0) return false;
  const normalizado = String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9#]/g, "");
  return ["N", "NO", "NUMERO", "ITEM", "LINHA", "ORDEM", "SEQ", "SEQUENCIA", "INDICE", "#"].includes(normalizado);
}

function valoresParecemNumeracao(linhas, coluna) {
  if (coluna !== 0) return false;
  const preenchidos = linhas.slice(1)
    .map((linha, indice) => ({ valor: linha?.[coluna], numeroLinha: indice + 1 }))
    .filter(({ valor }) => valor !== null && valor !== undefined && String(valor).trim() !== "");
  return preenchidos.length >= 2 && preenchidos.every(({ valor, numeroLinha }) => {
    const numero = Number(String(valor).trim());
    return Number.isInteger(numero) && numero === numeroLinha;
  });
}

for (const arquivo of arquivos) {
  const dados = fs.readFileSync(arquivo);
  const wb = XLSX.read(dados, { type: "buffer", raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
  const cabecalho = linhas[0] ?? [];
  const totais = { JNT: 0, ANJUN: 0, IMILE: 0, OUTRA: 0 };
  let total = 0;
  let revisar = 0;

  for (let c = 0; c < cabecalho.length; c++) {
    if (!String(cabecalho[c] ?? "").trim()) continue;
    if (cabecalhoDeNumeracao(cabecalho[c], c) || valoresParecemNumeracao(linhas, c)) continue;
    for (let r = 1; r < linhas.length; r++) {
      const valor = linhas[r]?.[c];
      if (valor === null || valor === undefined || String(valor).trim() === "") continue;
      total++;
      if (typeof valor === "number" && (!Number.isSafeInteger(valor) || String(Math.trunc(valor)).length > 15)) revisar++;
      const codigo = normalizar(valor);
      const encontrada = regras.find(([, re]) => re.test(codigo));
      totais[encontrada?.[0] ?? "OUTRA"]++;
    }
  }

  console.log("\n", path.basename(arquivo));
  console.log({ total, ...totais, revisar });
}
