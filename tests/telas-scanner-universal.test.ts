import { describe, expect, it } from "vitest";
import { telaSemCarga } from "../src/interface/telas/tela-sem-carga";
import { telaScanner } from "../src/interface/telas/tela-scanner";
import { telaResultadoScannerUniversal } from "../src/interface/telas/tela-resultado-scanner-universal";
import { telaSelecaoTransportadoraManual } from "../src/interface/telas/tela-selecao-transportadora-manual";

describe("telas do scanner universal", () => {
  it("oferece scanner mesmo sem carga distribuida", () => {
    const html = telaSemCarga({
      usuarioId: "U1",
      nome: "Allan",
      email: "allan@example.com",
      tipo: "ENTREGADOR",
      entregadorId: "ENT-A",
    }, 3);
    expect(html).toContain('id="abrir-scanner-livre"');
    expect(html).toContain("3 etiquetas processadas hoje");
  });

  it("nao limita a leitura a uma carga importada", () => {
    const html = telaScanner("Allan");
    expect(html).toContain("SCANNER UNIVERSAL");
    expect(html).toContain("RECONHECER E ENCAMINHAR");
    expect(html).not.toContain("SOMENTE SUA CARGA");
  });

  it("diferencia leitura livre de pacote contextualizado", () => {
    const html = telaResultadoScannerUniversal("Allan", {
      tracking: "6082326468665",
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
      origem: "SCANNER_LIVRE",
    }, true);
    expect(html).toContain("Sistema reconhecido");
    expect(html).toContain("Leitura livre");
    expect(html).not.toContain("REGISTRAR NO DELIVERY HUB");
  });

  it("permite selecionar empresa quando a etiqueta não casa com uma regra", () => {
    const html = telaSelecaoTransportadoraManual("Allan", "CODIGOSEMREGRA");
    expect(html).toContain('data-transportadora-manual="IMILE"');
    expect(html).toContain('data-transportadora-manual="ANJUN"');
    expect(html).toContain('data-transportadora-manual="JNT"');
  });
});
