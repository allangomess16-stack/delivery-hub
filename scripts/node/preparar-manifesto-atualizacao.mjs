import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const raiz = process.cwd();
const versao = fs.readFileSync(path.join(raiz, "VERSION"), "utf8").trim();
if (!/^\d+(\.\d+){2,3}$/.test(versao)) throw new Error("VERSION invalido para atualizacao.");

const nomeApk = `DeliveryHub-Piloto-Firebase-v${versao}.apk`;
const destino = path.join(raiz, "public", "app-update.json");
let apkUrl = "";
try {
  const remoto = execFileSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: raiz,
    encoding: "utf8",
  }).trim();
  const encontrado = remoto.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (encontrado) {
    apkUrl = `https://github.com/${encontrado[1]}/${encontrado[2]}/releases/download/v${versao}/${nomeApk}`;
  }
} catch {
  // Projeto sem remoto GitHub: não anuncia uma atualização que não pode baixar.
}
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, `${JSON.stringify({
  version: versao,
  apkUrl,
  mandatory: false,
  notes: "Atualização disponível. Instale para receber as melhorias mais recentes.",
}, null, 2)}\n`);
console.log(apkUrl
  ? `[OK] Manifesto de atualização preparado para v${versao}.`
  : "[ATENCAO] Remoto GitHub não encontrado. Manifesto salvo sem APK para não avisar atualização inválida.");
