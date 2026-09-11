import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const buildGradle = path.join(raiz, "android", "app", "build.gradle");
const manifest = path.join(raiz, "android", "app", "src", "main", "AndroidManifest.xml");
const strings = path.join(raiz, "android", "app", "src", "main", "res", "values", "strings.xml");

if (!fs.existsSync(buildGradle) || !fs.existsSync(manifest) || !fs.existsSync(strings)) {
  console.error("[ERRO] Projeto Android nao encontrado. Execute npx cap sync android antes.");
  process.exit(1);
}

let gradle = fs.readFileSync(buildGradle, "utf8");
if (!/applicationId\s+"[^"]+"/.test(gradle)) {
  console.error("[ERRO] applicationId nao encontrado em android/app/build.gradle.");
  process.exit(1);
}

// O namespace Java permanece o mesmo. Somente o ID instalado muda, permitindo
// que a homologacao conviva com a versao operacional assinada por outra chave.
gradle = gradle.replace(
  /applicationId\s+"[^"]+"/,
  'applicationId "com.deliveryhub.homologacao"',
);
const versao = fs.readFileSync(path.join(raiz, "VERSION"), "utf8").trim();
const partesVersao = versao.split(".").map((parte) => Number(parte));
if (partesVersao.length < 3 || partesVersao.some((parte) => !Number.isInteger(parte) || parte < 0)) {
  console.error("[ERRO] VERSION nao possui um numero de versao valido.");
  process.exit(1);
}
const versionCode = partesVersao[0] * 1000000 + partesVersao[1] * 10000 + partesVersao[2] * 100 + (partesVersao[3] ?? 0);
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versao}"`);
fs.writeFileSync(buildGradle, gradle, "utf8");

// Limpa uma marca criada por uma revisão anterior deste gerador. O nome
// mostrado no launcher continua "Delivery Hub"; a diferenciação segura é o
// applicationId e o nome do APK, sem duplicar android:label no Manifest.
let conteudoManifest = fs.readFileSync(manifest, "utf8");
const inicio = "<!-- DELIVERY_HUB_HOMOLOGACAO_LABEL_START -->";
const fim = "<!-- DELIVERY_HUB_HOMOLOGACAO_LABEL_END -->";
if (conteudoManifest.includes(inicio)) {
  conteudoManifest = conteudoManifest.replace(
    new RegExp(`\\s*${inicio}[\\s\\S]*?${fim}`),
    "",
  );
}
fs.writeFileSync(manifest, conteudoManifest, "utf8");

let conteudoStrings = fs.readFileSync(strings, "utf8");
conteudoStrings = conteudoStrings.replace(
  /<string name="app_name">[^<]*<\/string>/,
  '<string name="app_name">Delivery Hub Teste</string>',
);
conteudoStrings = conteudoStrings.replace(
  /<string name="title_activity_main">[^<]*<\/string>/,
  '<string name="title_activity_main">Delivery Hub Teste</string>',
);
conteudoStrings = conteudoStrings.replace(
  /<string name="package_name">[^<]*<\/string>/,
  '<string name="package_name">com.deliveryhub.homologacao</string>',
);
conteudoStrings = conteudoStrings.replace(
  /<string name="custom_url_scheme">[^<]*<\/string>/,
  '<string name="custom_url_scheme">com.deliveryhub.homologacao</string>',
);
fs.writeFileSync(strings, conteudoStrings, "utf8");

console.log("[OK] APK de homologacao configurado como Delivery Hub Teste (instalacao paralela).");
