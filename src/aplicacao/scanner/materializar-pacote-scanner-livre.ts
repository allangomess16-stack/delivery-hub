import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { ResultadoScannerUniversal } from "../../dominio/scanner/tipos";

export interface ContextoOperacaoScannerLivre {
  entregadorId: string;
  nomeEntregador: string;
  dataOperacao: string;
  agoraIso: string;
  novoId: () => string;
}

export interface OperacaoScannerMaterializada {
  carga: CargaEntregador;
  pacote: PacoteDaCarga;
  cargaCriada: boolean;
  pacoteCriado: boolean;
}

function criarCarga(contexto: ContextoOperacaoScannerLivre): CargaEntregador {
  const cargaId = `scanner-${contexto.dataOperacao}-${contexto.novoId()}`;
  return {
    cargaId,
    cargaOrigemId: cargaId,
    referenciaCarga: `Scanner universal - ${contexto.dataOperacao}`,
    referenciaLote: "SCANNER-LIVRE",
    entregadorId: contexto.entregadorId,
    nomeEntregador: contexto.nomeEntregador,
    dataOperacao: contexto.dataOperacao,
    nomeArquivoOrigem: "Scanner universal",
    origemOperacional: "SCANNER_UNIVERSAL",
    criadaEm: contexto.agoraIso,
    pacotes: [],
    chaveRemotaSimulada:
      `couriers/${contexto.entregadorId}/loads/${contexto.dataOperacao}/${cargaId}`,
    status: "EM_OPERACAO",
    publicadaEm: contexto.agoraIso,
  };
}

export function materializarPacoteScannerLivre(
  leitura: ResultadoScannerUniversal,
  cargaAtual: CargaEntregador | null,
  contexto: ContextoOperacaoScannerLivre,
): OperacaoScannerMaterializada {
  if (leitura.pacote && cargaAtual) {
    return { carga: cargaAtual, pacote: leitura.pacote, cargaCriada: false, pacoteCriado: false };
  }

  const carga = cargaAtual ?? criarCarga(contexto);
  const existente = carga.pacotes.find(
    (pacote) => pacote.codigoNormalizado === leitura.tracking,
  );
  if (existente) {
    return {
      carga,
      pacote: existente,
      cargaCriada: !cargaAtual,
      pacoteCriado: false,
    };
  }

  const pacote: PacoteDaCarga = {
    id: `scanner-${contexto.novoId()}`,
    entregador: contexto.nomeEntregador,
    codigoOriginal: leitura.tracking,
    codigoNormalizado: leitura.tracking,
    transportadora: leitura.transportadora,
    precisaRevisao: leitura.transportadoraSelecionadaManual === true,
    origem: "MANUAL",
    situacaoOperacional: leitura.origem === "EXTRA_ROTA" ? "EXTRA_ROTA" : "AVULSA",
    alertaAdmin: leitura.origem === "EXTRA_ROTA",
    conciliacaoExtraRota: leitura.origem === "EXTRA_ROTA" ? { status: "ABERTA" } : undefined,
    criadoEm: contexto.agoraIso,
    atualizadoEm: contexto.agoraIso,
  };
  carga.pacotes.push(pacote);
  return {
    carga,
    pacote,
    cargaCriada: !cargaAtual,
    pacoteCriado: true,
  };
}
