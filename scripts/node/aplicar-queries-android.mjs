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

const inicio = "<!-- DELIVERY_HUB_EXTERNAL_APPS_START -->";
const fim = "<!-- DELIVERY_HUB_EXTERNAL_APPS_END -->";

const bloco = `${inicio}
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
    ${fim}`;

const regex = new RegExp(
  `${inicio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${fim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
);

if (regex.test(conteudo)) {
  conteudo = conteudo.replace(regex, bloco);
} else {
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

fs.writeFileSync(manifest, conteudo, "utf8");
console.log("[OK] <queries> Anjun/iMile aplicado ao AndroidManifest.xml.");
