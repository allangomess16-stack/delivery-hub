import { describe, expect, it } from "vitest";
import type { Auth } from "firebase/auth";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import type { CargaEntregador } from "../src/dominio/carga/tipos";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioCargaLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { RepositorioCargaFirebaseAdapter } from "../src/infraestrutura/firebase/repositorio-carga-firebase-adapter";
import type { ClienteRealtimeRest } from "../src/infraestrutura/firebase/cliente-realtime-rest";

function cargaComOperacaoLocal(operacaoId: string): CargaEntregador {
  const entrega = criarEstadoEntregaPadrao();
  entrega.estadoFisico = "ENTREGUE";
  entrega.estadoIntegracao = "AGUARDANDO_SINCRONIZACAO";
  entrega.operacaoIntegracaoId = operacaoId;

  return {
    cargaId: "carga-1",
    cargaOrigemId: "origem-1",
    entregadorId: "entregador-1",
    nomeEntregador: "Entregador",
    dataOperacao: "2026-09-08",
    nomeArquivoOrigem: "piloto.xlsx",
    criadaEm: "2026-09-08T10:00:00.000Z",
    chaveRemotaSimulada: "cargas/entregador-1/carga-1",
    status: "PUBLICADA",
    pacotes: [{
      id: "pacote-1",
      entregador: "Entregador",
      codigoOriginal: "6082326468665",
      codigoNormalizado: "6082326468665",
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
      precisaRevisao: false,
      entrega,
    }],
  };
}

function cargaOficialSemEntrega(carga: CargaEntregador): CargaEntregador {
  const oficial = structuredClone(carga);
  delete oficial.pacotes[0].entrega;
  return oficial;
}

function clienteRestFalso(
  carga: CargaEntregador,
  operacaoRemotaId: string,
): ClienteRealtimeRest {
  const entregaRemota = structuredClone(carga.pacotes[0].entrega!);
  entregaRemota.estadoIntegracao = "AGUARDANDO_INTEGRACAO";
  entregaRemota.sincronizadaEm = "2026-09-08T18:00:00.000Z";

  return {
    async obter(caminho: string) {
      if (caminho === "cargas/entregador-1") {
        return {
          "2026-09-08": {
            "carga-1": cargaOficialSemEntrega(carga),
          },
        };
      }
      if (caminho === "operacoes/entregador-1/carga-1") {
        return {
          "pacote-1": {
            [operacaoRemotaId]: {
              operacaoId: operacaoRemotaId,
              tipo: "ENTREGA_CONFIRMADA",
              entrega: entregaRemota,
              usuarioId: "usuario-1",
              atualizadoEm: "2026-09-08T18:00:00.000Z",
            },
          },
        };
      }
      return null;
    },
  } as ClienteRealtimeRest;
}

describe("Reconciliação da carga Firebase", () => {
  it("repara AGUARDANDO SYNC quando o Hub possui o mesmo UUID", async () => {
    const carga = cargaComOperacaoLocal("operacao-1");
    const local = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    await local.salvarCarga(carga.entregadorId, carga);
    const repositorio = new RepositorioCargaFirebaseAdapter(
      {} as Auth,
      clienteRestFalso(carga, "operacao-1"),
      local,
    );

    const atualizada = await repositorio.obterCargaAtual(carga.entregadorId);

    expect(atualizada?.pacotes[0].entrega?.estadoIntegracao).toBe(
      "AGUARDANDO_INTEGRACAO",
    );
  });

  it("preserva operação local quando o UUID remoto é diferente", async () => {
    const carga = cargaComOperacaoLocal("operacao-local");
    const local = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    await local.salvarCarga(carga.entregadorId, carga);
    const repositorio = new RepositorioCargaFirebaseAdapter(
      {} as Auth,
      clienteRestFalso(carga, "operacao-remota-antiga"),
      local,
    );

    const atualizada = await repositorio.obterCargaAtual(carga.entregadorId);

    expect(atualizada?.pacotes[0].entrega?.estadoIntegracao).toBe(
      "AGUARDANDO_SINCRONIZACAO",
    );
    expect(atualizada?.pacotes[0].entrega?.operacaoIntegracaoId).toBe(
      "operacao-local",
    );
  });
});
