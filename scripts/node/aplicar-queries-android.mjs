import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const manifest = path.join(
  raiz,
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);

if (!fs.existsSync(manifest)) {
  console.error(`AndroidManifest.xml nao encontrado: ${manifest}`);
  process.exit(1);
}

let conteudo = fs.readFileSync(manifest, "utf8");

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aplicarBlocoAntesDaApplication(inicio, fim, bloco) {
  const regex = new RegExp(`${escaparRegex(inicio)}[\\s\\S]*?${escaparRegex(fim)}`);

  if (regex.test(conteudo)) {
    conteudo = conteudo.replace(regex, bloco);
    return;
  }

  const posicaoApplication = conteudo.indexOf("<application");
  if (posicaoApplication < 0) {
    console.error("Tag <application> nao encontrada no AndroidManifest.xml.");
    process.exit(1);
  }

  conteudo =
    conteudo.slice(0, posicaoApplication) +
    bloco +
    "\n    " +
    conteudo.slice(posicaoApplication);
}

const inicioCamera = "<!-- DELIVERY_HUB_CAMERA_START -->";
const fimCamera = "<!-- DELIVERY_HUB_CAMERA_END -->";
const blocoCamera = `${inicioCamera}
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    ${fimCamera}`;

aplicarBlocoAntesDaApplication(
  inicioCamera,
  fimCamera,
  blocoCamera,
);

const inicioQueries = "<!-- DELIVERY_HUB_EXTERNAL_APPS_START -->";
const fimQueries = "<!-- DELIVERY_HUB_EXTERNAL_APPS_END -->";
const blocoQueries = `${inicioQueries}
    <queries>
        <package android:name="com.anjun.supplierManagement" />
        <package android:name="com.imile.redelivery" />

        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="image/*" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="text/plain" />
        </intent>
    </queries>
    ${fimQueries}`;

aplicarBlocoAntesDaApplication(
  inicioQueries,
  fimQueries,
  blocoQueries,
);

fs.writeFileSync(manifest, conteudo, "utf8");
console.log("[OK] Permissao de camera e <queries> Anjun/iMile aplicados ao AndroidManifest.xml.");

const buildGradle = path.join(raiz, "android", "app", "build.gradle");
const packageJson = path.join(raiz, "package.json");

if (fs.existsSync(buildGradle) && fs.existsSync(packageJson)) {
  const pacote = JSON.parse(fs.readFileSync(packageJson, "utf8"));
  const versao = String(pacote.version ?? "0.0.0");
  const partes = versao.split(".").map((item) => Number.parseInt(item, 10) || 0);
  const [major = 0, minor = 0, patch = 0] = partes;
  const versionCode = major * 10000 + minor * 100 + patch;

  let gradle = fs.readFileSync(buildGradle, "utf8");
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versao}"`);
  fs.writeFileSync(buildGradle, gradle, "utf8");
  console.log(`[OK] Android versionName=${versao} versionCode=${versionCode}.`);
}
