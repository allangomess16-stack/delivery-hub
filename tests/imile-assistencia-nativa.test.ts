import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const servico = readFileSync("native/android/IMileAccessibilityService.java", "utf8");
const ponte = readFileSync("native/android/NativeBridgePlugin.java", "utf8");
const configurador = readFileSync("scripts/node/aplicar-native-bridge-android.mjs", "utf8");
const contrato = readFileSync("docs/integracoes/IMILE_2.3.21_MAPEAMENTO_ASSISTIDO.md", "utf8");

describe("assistencia nativa iMile", () => {
  it("limita a observacao ao pacote da iMile e nao automatiza a baixa", () => {
    expect(servico).toContain('"com.imile.redelivery"');
    expect(servico).toContain("session.expired()");
    expect(servico).toContain("Abrir encomenda");
    expect(servico).toContain("Tarefas de entrega");
    expect(servico).toContain("Aguarde a tela Provas");
    expect(servico).not.toContain('"Entregue"');
    expect(servico).not.toContain("Assinatura do cliente");
  });

  it("mantem a ativacao explicitamente opt-in pelo Android", () => {
    expect(ponte).toContain("prepareIMileAssist");
    expect(ponte).toContain("openIMileAssistSettings");
    expect(configurador).toContain("android.permission.BIND_ACCESSIBILITY_SERVICE");
    expect(configurador).toContain("IMileAccessibilityService");
  });

  it("documenta os seletores observados e os limites da automacao", () => {
    expect(contrato).toContain("Nome Completo");
    expect(contrato).toContain("Número do Documento");
    expect(contrato).toContain("rótulo visual/`content-desc`");
    expect(contrato).toContain("nunca tocados pelo serviço");
  });
});
