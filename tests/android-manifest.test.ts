import { readFileSync } from "node:fs";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

const caminhoManifest = "android/app/src/main/AndroidManifest.xml";
const manifestXml = readFileSync(caminhoManifest, "utf8");
const geradorIdentidade = readFileSync(
  "scripts/node/aplicar-identidade-apk-homologacao.mjs",
  "utf8",
);
const geradorApk = readFileSync("BAT/APK/01_GERAR_APK_HOMOLOGACAO.bat", "utf8");

describe("AndroidManifest do aplicativo", () => {
  it("possui XML sintaticamente valido", () => {
    expect(XMLValidator.validate(manifestXml)).toBe(true);
  });

  it("preserva permissao de camera e visibilidade da iMile", () => {
    const parser = new XMLParser({ ignoreAttributes: false });
    const manifest = parser.parse(manifestXml).manifest;
    const permissoes = Array.isArray(manifest["uses-permission"])
      ? manifest["uses-permission"]
      : [manifest["uses-permission"]];
    const pacotes = Array.isArray(manifest.queries.package)
      ? manifest.queries.package
      : [manifest.queries.package];

    expect(permissoes.map((item: Record<string, string>) => item["@_android:name"]))
      .toContain("android.permission.CAMERA");
    expect(pacotes.map((item: Record<string, string>) => item["@_android:name"]))
      .toContain("com.imile.redelivery");
    expect(manifest.application.activity["@_android:exported"]).toBe("true");
  });

  it("nao remove o fechamento da application e valida antes do Gradle", () => {
    expect(geradorIdentidade).not.toContain("${fim}>?");
    expect(geradorApk).toContain("validar-android-manifest.mjs");
    expect(geradorApk.indexOf("validar-android-manifest.mjs"))
      .toBeLessThan(geradorApk.indexOf("gradlew.bat"));
  });
});
