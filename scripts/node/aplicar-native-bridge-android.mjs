import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const origemPlugin = path.join(raiz, "native", "android", "NativeBridgePlugin.java");
const origemSondaAutofill = path.join(
  raiz,
  "native",
  "android",
  "DeliveryHubAutofillProbe.java",
);
const origemConfigAutofill = path.join(
  raiz,
  "native",
  "android",
  "res",
  "xml",
  "deliveryhub_autofill_probe.xml",
);
const destinoPlugin = path.join(
  raiz,
  "android",
  "app",
  "src",
  "main",
  "java",
  "com",
  "deliveryhub",
  "app",
  "nativebridge",
  "NativeBridgePlugin.java",
);
const mainActivity = path.join(
  raiz,
  "android",
  "app",
  "src",
  "main",
  "java",
  "com",
  "deliveryhub",
  "app",
  "MainActivity.java",
);
const pastaNativa = path.dirname(destinoPlugin);
const manifest = path.join(raiz, "android", "app", "src", "main", "AndroidManifest.xml");
const strings = path.join(raiz, "android", "app", "src", "main", "res", "values", "strings.xml");
const configAutofill = path.join(
  raiz,
  "android",
  "app",
  "src",
  "main",
  "res",
  "xml",
  "deliveryhub_autofill_probe.xml",
);

for (const arquivo of [
  origemPlugin,
  origemSondaAutofill,
  origemConfigAutofill,
  mainActivity,
  manifest,
  strings,
]) {
  if (!fs.existsSync(arquivo)) {
    console.error(\`[ERRO] Arquivo Android nao encontrado: \${arquivo}\`);
    process.exit(1);
  }
}

fs.mkdirSync(pastaNativa, { recursive: true });
fs.copyFileSync(origemPlugin, destinoPlugin);
fs.copyFileSync(
  origemSondaAutofill,
  path.join(pastaNativa, "DeliveryHubAutofillProbe.java"),
);
fs.mkdirSync(path.dirname(configAutofill), { recursive: true });
fs.copyFileSync(origemConfigAutofill, configAutofill);

let atividade = fs.readFileSync(mainActivity, "utf8");
const importBundle = "import android.os.Bundle;";
const importPlugin =
  "import com.deliveryhub.app.nativebridge.NativeBridgePlugin;";

if (!atividade.includes(importBundle)) {
  atividade = atividade.replace(
    "package com.deliveryhub.app;",
    \`package com.deliveryhub.app;\n\n\${importBundle}\`,
  );
}

if (!atividade.includes(importPlugin)) {
  atividade = atividade.replace(
    "import com.getcapacitor.BridgeActivity;",
    \`import com.getcapacitor.BridgeActivity;\n\${importPlugin}\`,
  );
}

if (!atividade.includes("registerPlugin(NativeBridgePlugin.class)")) {
  if (/public class MainActivity extends BridgeActivity\s*\{\s*\}/.test(atividade)) {
    atividade = atividade.replace(
      /public class MainActivity extends BridgeActivity\s*\{\s*\}/,
      \`public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}\`,
    );
  } else if (atividade.includes("void onCreate(")) {
    console.error(
      "[ERRO] MainActivity ja possui onCreate sem registro do NativeBridge. Revise manualmente.",
    );
    process.exit(1);
  } else {
    const ultimaChave = atividade.lastIndexOf("}");
    if (ultimaChave < 0) {
      console.error("[ERRO] Classe MainActivity invalida.");
      process.exit(1);
    }
    atividade = \`\${atividade.slice(0, ultimaChave)}
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
\${atividade.slice(ultimaChave)}\`;
  }
}

atividade = atividade.replace(
  /super\.onCreate\(savedInstanceState\);\s*registerPlugin\(NativeBridgePlugin\.class\);/,
  \`registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);\`,
);

const indiceRegistro = atividade.indexOf("registerPlugin(NativeBridgePlugin.class)");
const indiceSuper = atividade.indexOf("super.onCreate(savedInstanceState)");
if (indiceRegistro < 0 || indiceSuper < 0 || indiceRegistro > indiceSuper) {
  console.error("[ERRO] NativeBridge precisa ser registrado antes de super.onCreate().");
  process.exit(1);
}
fs.writeFileSync(mainActivity, atividade, "utf8");

const service = \`
        <!-- DELIVERY_HUB_AUTOFILL_PROBE_START -->
        <service
            android:name=".nativebridge.DeliveryHubAutofillProbe"
            android:label="@string/delivery_hub_autofill_probe_label"
            android:permission="android.permission.BIND_AUTOFILL_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.autofill.AutofillService" />
            </intent-filter>
            <meta-data
                android:name="android.autofill"
                android:resource="@xml/deliveryhub_autofill_probe" />
        </service>
        <!-- DELIVERY_HUB_AUTOFILL_PROBE_END -->
\`;
let textoManifest = fs.readFileSync(manifest, "utf8");
const blocoServico = /<!-- DELIVERY_HUB_(?:IMILE_ASSIST|AUTOFILL_PROBE)_START -->[\s\S]*?<!-- DELIVERY_HUB_(?:IMILE_ASSIST|AUTOFILL_PROBE)_END -->/;
if (blocoServico.test(textoManifest)) {
  textoManifest = textoManifest.replace(blocoServico, service.trim());
} else if (!textoManifest.includes("DeliveryHubAutofillProbe")) {
  textoManifest = textoManifest.replace("    </application>", \`\${service}    </application>\`);
}
fs.writeFileSync(manifest, textoManifest, "utf8");

let textoStrings = fs.readFileSync(strings, "utf8");
textoStrings = textoStrings
  .replace(/\s*<string name="delivery_hub_imile_assist_label">[\s\S]*?<\/string>/g, "")
  .replace(/\s*<string name="delivery_hub_imile_assist_description">[\s\S]*?<\/string>/g, "");
if (!textoStrings.includes("delivery_hub_autofill_probe_label")) {
  textoStrings = textoStrings.replace(
    "</resources>",
    "    <string name=\\"delivery_hub_autofill_probe_label\\">Delivery Hub Autofill Test</string>\\n" +
    "    <string name=\\"delivery_hub_autofill_probe_description\\">Diagnostico privado de preenchimento automatico para iMile. Nao salva nem preenche dados.</string>\\n</resources>",
  );
}
fs.writeFileSync(strings, textoStrings, "utf8");

console.log("[OK] NativeBridge e sonda Autofill preparados no Android.");
