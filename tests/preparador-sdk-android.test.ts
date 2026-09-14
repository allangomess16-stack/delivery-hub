import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bat = readFileSync("BAT/APK/00_PREPARAR_SDK_ANDROID.bat", "utf8");
const fallback = readFileSync("scripts/powershell/android-instalar-pacotes-direto.ps1", "utf8");
const licenca = readFileSync("scripts/powershell/android-registrar-licenca.ps1", "utf8");

describe("preparador do SDK Android", () => {
  it("usa Android CLI e nao executa o sdkmanager incompatível com Java 21", () => {
    expect(bat).toContain("sdk install");
    expect(bat).toContain("platforms/android-35");
    expect(bat).toContain("build-tools/34.0.0");
    expect(bat).not.toMatch(/call\s+"!SDKMANAGER!"/i);
  });

  it("valida fisicamente todos os componentes necessarios", () => {
    expect(bat).toContain("platform-tools\\adb.exe");
    expect(bat).toContain("platforms\\android-35\\android.jar");
    expect(bat).toContain("build-tools\\34.0.0\\aapt2.exe");
    expect(bat).toContain("SDK_REUTILIZADO");
  });

  it("possui fallback oficial com tamanho e checksum verificados", () => {
    expect(bat).toContain("android-instalar-pacotes-direto.ps1");
    expect(fallback).toContain("https://dl.google.com/android/repository/repository2-");
    expect(fallback).toContain("Get-FileHash");
    expect(fallback).toContain('"platforms;android-35"');
    expect(fallback).toContain('"build-tools;34.0.0"');
  });

  it("solicita aceite expresso e registra a licenca no SDK local", () => {
    expect(bat).toContain("android-registrar-licenca.ps1");
    expect(bat).toContain("choice /C SN");
    expect(licenca).toContain("android-sdk-license");
    expect(licenca).toContain("24333f8a63b6825ea9c5514f83c2829b004d1fee");
  });
});
