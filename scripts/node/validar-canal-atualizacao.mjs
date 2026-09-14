import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const raiz = process.cwd();
const versao = fs.readFileSync(path.join(raiz, "VERSION"), "utf8").trim();
const nomeApk = `DeliveryHub-Piloto-Firebase-v${versao}.apk`;

function lerRepositorioCanalPublico() {
  const configuracao = path.join(raiz, "firebase", "projeto.local.env");
  if (!fs.existsSync(configuracao)) return "";
  const linha = fs.readFileSync(configuracao, "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith("UPDATE_RELEASE_REPOSITORY="));
  return linha?.slice("UPDATE_RELEASE_REPOSITORY=".length).trim() ?? "";
}

function executarGitHub(argumentos) {
  try {
    return execFileSync("gh", argumentos, { cwd: raiz, encoding: "utf8" }).trim();
  } catch {
    throw new Error("GitHub CLI nao autenticada. Execute BAT\\GITHUB\\00_LOGIN_GITHUB.bat.");
  }
}

const canalConfigurado = lerRepositorioCanalPublico();
let repositorio = canalConfigurado;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositorio)) {
  const remoto = execFileSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: raiz,
    encoding: "utf8",
  }).trim();
  const encontrado = remoto.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!encontrado) throw new Error("Remote origin do GitHub nao encontrado.");
  repositorio = `${encontrado[1]}/${encontrado[2]}`;
}
const dadosRepositorio = JSON.parse(executarGitHub([
  "repo", "view", repositorio, "--json", "visibility",
]));

if (dadosRepositorio.visibility !== "PUBLIC") {
  throw new Error(
    `O repositorio ${repositorio} esta privado. O APK de atualizacao precisa estar em uma Release publica. `
    + "Torne-o publico ou configure um repositorio publico separado somente para as Releases.",
  );
}

const dadosRelease = JSON.parse(executarGitHub([
  "release", "view", `v${versao}`, "--repo", repositorio, "--json", "assets",
]));
const possuiApk = dadosRelease.assets.some((asset) => asset.name === nomeApk);
if (!possuiApk) {
  throw new Error(
    `A Release v${versao} nao possui ${nomeApk}. Execute BAT\\GITHUB\\08_ENVIAR_APK_PARA_RELEASE.bat.`,
  );
}

console.log(`[OK] Canal de atualizacao publico validado: ${repositorio}, ${nomeApk}.`);
