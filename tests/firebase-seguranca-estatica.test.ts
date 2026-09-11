import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface NoRegra { [chave: string]: unknown }

const arquivo = new URL("../firebase/database.rules.json", import.meta.url);
const regras = JSON.parse(readFileSync(arquivo, "utf8")) as { rules: NoRegra };

describe("regras Firebase operacionais", () => {
  it("nega leitura global e libera cargas/operacoes apenas por entregador", () => {
    expect(regras.rules[".read"]).toBe(false);
    expect(regras.rules[".write"]).toBe(false);
    expect((regras.rules.cargas as NoRegra)[".read"]).toBeUndefined();
    expect((regras.rules.operacoes as NoRegra)[".read"]).toBeUndefined();
    expect(((regras.rules.cargas as NoRegra).$entregadorId as NoRegra)[".read"]).toContain("$entregadorId");
    expect(((regras.rules.operacoes as NoRegra).$entregadorId as NoRegra)[".read"]).toContain("$entregadorId");
  });

  it("nao concede escrita no ramo inteiro de operacoes nem permite apagar a operacao", () => {
    const entregador = (regras.rules.operacoes as NoRegra).$entregadorId as NoRegra;
    expect(entregador[".write"]).toBeUndefined();
    const operacao = (((entregador.$cargaId as NoRegra).$pacoteId as NoRegra).$operacaoId as NoRegra);
    expect(operacao[".write"]).toContain("newData.exists()");
    expect(operacao[".write"]).toContain("AGUARDANDO_INTEGRACAO");
    const entrega = operacao.entrega as NoRegra;
    expect((entrega.$outro as NoRegra)[".validate"]).toBe(false);
    expect(((entrega.fotos as NoRegra).$indice as NoRegra)[".validate"])
      .toContain("$indice.matches(/^[0-9]$/)");
    expect(((entrega.eventos as NoRegra).$indice as NoRegra)[".validate"])
      .toContain("$indice.matches(/^([0-9]|[1-9][0-9])$/)");
    expect((entrega.assinatura as NoRegra)[".validate"])
      .toContain("chaveArquivo");
  });

  it("isola telemetria diaria e reserva contratos ao suporte", () => {
    const meta = regras.rules.meta as NoRegra;
    expect(meta[".write"]).toBeUndefined();
    const contrato = ((((meta.integracoes as NoRegra).$transportadora as NoRegra).$versionCode) as NoRegra);
    expect(contrato[".write"]).toContain("SUPORTE");
    expect(contrato[".write"]).toContain("newData.exists()");

    const suporte = regras.rules.suporte as NoRegra;
    expect(suporte[".read"]).toBe(false);
    const integracoes = suporte.integracoes as NoRegra;
    const dia = integracoes.$dia as NoRegra;
    expect(dia[".read"]).toContain("SUPORTE");
    expect(dia[".read"]).toContain("query.orderByKey");
    expect(dia[".read"]).toContain("query.limitToLast <= 200");
    const evento = dia.$eventoId as NoRegra;
    expect(evento[".write"]).toContain("newData.child('usuarioId').val() === auth.uid");
    expect(evento[".write"]).toContain("!data.exists()");
    expect((evento.$outro as NoRegra)[".validate"]).toBe(false);
  });
});
