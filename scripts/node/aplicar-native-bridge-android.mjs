import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const origemPlugin = path.join(
  raiz,
  "native",
  "android",
  "NativeBridgePlugin.java",
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

for (const arquivo of [origemPlugin, mainActivity]) {
  if (!fs.existsSync(arquivo)) {
    console.error(`[ERRO] Arquivo Android nao encontrado: ${arquivo}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(destinoPlugin), { recursive: true });
fs.copyFileSync(origemPlugin, destinoPlugin);

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
console.log("[OK] NativeBridge copiado e registrado no Capacitor Android.");
