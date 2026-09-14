import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const probe = readFileSync(
  "native/android/DeliveryHubAutofillProbe.java",
  "utf8",
);
const installer = readFileSync(
  "scripts/node/aplicar-native-bridge-android.mjs",
  "utf8",
);

describe("sonda Autofill iMile", () => {
  it("registra somente um AutofillService limitado à iMile", () => {
    expect(manifest).toContain("DeliveryHubAutofillProbe");
    expect(manifest).toContain("android.permission.BIND_AUTOFILL_SERVICE");
    expect(manifest).not.toContain("IMileAccessibilityService");
    expect(probe).toContain('IMILE_PACKAGE = "com.imile.redelivery"');
  });

  it("não lê conteúdo, descrição visual nem preenche campos", () => {
    expect(probe).not.toContain("getText()");
    expect(probe).not.toContain("getContentDescription()");
    expect(probe).not.toContain("setText");
    expect(probe).toContain("callback.onSuccess(null)");
  });

  it("reaplica a sonda no Capacitor Android", () => {
    expect(installer).toContain("DeliveryHubAutofillProbe.java");
    expect(installer).not.toContain("IMileAccessibilityService.java");
  });
});
