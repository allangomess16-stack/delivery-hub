import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const origemPlugin = path.join(
  raiz,
  "native",
  "android",
  "NativeBridgePlugin.java",
);
const origemAssistente = path.join(
  raiz,
  "native",
  "android",
  "IMileAccessibilityService.java",
);
const origemArmazenamentoAssistente = path.join(
  raiz,
  "native",
  "android",
  "IMileAssistStore.java",
);
const origemConfigAssistente = path.join(
  raiz,
  "native",
  "android",
  "res",
  "xml",
  "deliveryhub_imile_accessibility.xml",
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
const configAssistente = path.join(raiz, "android", "app", "src", "main", "res", "xml", "deliveryhub_imile_accessibility.xml");

for (const arquivo of [origemPlugin, origemAssistente, origemArmazenamentoAssistente, origemConfigAssistente, mainActivity, manifest, strings]) {
  if (!fs.existsSync(arquivo)) {
    console.error(`[ERRO] Arquivo Android nao encontrado: ${arquivo}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(destinoPlugin), { recursive: true });
fs.copyFileSync(origemPlugin, destinoPlugin);
fs.copyFileSync(origemAssistente, path.join(pastaNativa, "IMileAccessibilityService.java"));
fs.copyFileSync(origemArmazenamentoAssistente, path.join(pastaNativa, "IMileAssistStore.java"));
fs.mkdirSync(path.dirname(configAssistente), { recursive: true });
fs.copyFileSync(origemConfigAssistente, configAssistente);

let atividade = fs.readFileSync(mainActivity, "utf8");

const importBundle = "import android.os.Bundle;";
const importPlugin =
  "import com.deliveryhub.app.nativebridge.NativeBridgePlugin;";

if (!atividade.includes(importBundle)) {
  atividade = atividade.replace(
    "package com.deliveryhub.app;",
    `package com.deliveryhub.app;\n\n${importBundle}`,
  );
}

if (!atividade.includes(importPlugin)) {
  atividade = atividade.replace(
    "import com.getcapacitor.BridgeActivity;",
    `import com.getcapacitor.BridgeActivity;\n${importPlugin}`,
  );
}

if (!atividade.includes("registerPlugin(NativeBridgePlugin.class)")) {
  if (/public class MainActivity extends BridgeActivity\s*\{\s*\}/.test(atividade)) {
    atividade = atividade.replace(
      /public class MainActivity extends BridgeActivity\s*\{\s*\}/,
      `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}`,
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
    atividade = `${atividade.slice(0, ultimaChave)}
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
${atividade.slice(ultimaChave)}`;
  }
}

// O BridgeActivity cria a ponte dentro de super.onCreate(). O plugin local
// precisa entrar no Bridge.Builder antes desse momento.
atividade = atividade.replace(
  /super\.onCreate\(savedInstanceState\);\s*registerPlugin\(NativeBridgePlugin\.class\);/,
  `registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);`,
);

const indiceRegistro = atividade.indexOf("registerPlugin(NativeBridgePlugin.class)");
const indiceSuper = atividade.indexOf("super.onCreate(savedInstanceState)");
if (indiceRegistro < 0 || indiceSuper < 0 || indiceRegistro > indiceSuper) {
  console.error("[ERRO] NativeBridge precisa ser registrado antes de super.onCreate().");
  process.exit(1);
}

fs.writeFileSync(mainActivity, atividade, "utf8");

let textoManifest = fs.readFileSync(manifest, "utf8");
const service = `
        <!-- DELIVERY_HUB_IMILE_ASSIST_START -->
        <service
            android:name=".nativebridge.IMileAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true"
            android:label="@string/delivery_hub_imile_assist_label">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/deliveryhub_imile_accessibility" />
        </service>
        <!-- DELIVERY_HUB_IMILE_ASSIST_END -->
`;
const inicioAssistente = "<!-- DELIVERY_HUB_IMILE_ASSIST_START -->";
const fimAssistente = "<!-- DELIVERY_HUB_IMILE_ASSIST_END -->";
const blocoAssistente = new RegExp(`${inicioAssistente}[\\s\\S]*?${fimAssistente}`);
if (blocoAssistente.test(textoManifest)) {
  textoManifest = textoManifest.replace(blocoAssistente, service.trim());
} else if (!textoManifest.includes("IMileAccessibilityService")) {
  textoManifest = textoManifest.replace("    </application>", `${service}    </application>`);
}
fs.writeFileSync(manifest, textoManifest, "utf8");

let textoStrings = fs.readFileSync(strings, "utf8");
if (!textoStrings.includes("delivery_hub_imile_assist_label")) {
  textoStrings = textoStrings.replace(
    "</resources>",
    "    <string name=\"delivery_hub_imile_assist_label\">Delivery Hub • preenchimento iMile</string>\n" +
    "    <string name=\"delivery_hub_imile_assist_description\">Preenche campos previamente conferidos no Delivery Hub. Nunca envia, assina ou confirma uma entrega.</string>\n</resources>",
  );
  fs.writeFileSync(strings, textoStrings, "utf8");
}
console.log("[OK] NativeBridge copiado e registrado no Capacitor Android.");
