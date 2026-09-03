import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { identificarTransportadora } from "../identificar-transportadora";
import { normalizarCodigo } from "../normalizar-codigo";
import { obterEstadoEntrega } from "../estado-entrega";
import { definirLocalizacaoPacote } from "../regiao/atribuir-localizacao-pacote";
import { idRegiaoPacote } from "../regiao/resumir-carga-por-regiao";

function agora(): string {
  return new Date().toISOString();
}

export function criarCargaManual(
  perfil: PerfilEntregador,
  dataOperacao: string,
): CargaEntregador {
  if (!perfil.ativo) {
    throw new Error("Nao e possivel criar carga para um perfil inativo.");
  }

  const cargaId = crypto.randomUUID();
  return {
    cargaId,
    cargaOrigemId: `MANUAL-${cargaId}`,
    entregadorId: perfil.entregadorId,
    nomeEntregador: perfil.nomeOficial,
    dataOperacao,
    nomeArquivoOrigem: "CRIACAO MANUAL",
    criadaEm: agora(),
    pacotes: [],
    chaveRemotaSimulada: `loads/${dataOperacao}/couriers/${perfil.entregadorId}/${cargaId}`,
    status: "RASCUNHO",
  };
}

export function criarPacoteManual(
  valorCodigo: unknown,
  nomeEntregador: string,
  endereco = "",
): PacoteDaCarga {
  const normalizado = normalizarCodigo(valorCodigo);

  if (!normalizado.codigo) {
    throw new Error("Informe um codigo valido.");
  }

  const pacote: PacoteDaCarga = {
    id: crypto.randomUUID(),
    entregador: nomeEntregador,
    codigoOriginal: String(valorCodigo ?? ""),
    codigoNormalizado: normalizado.codigo,
    transportadora: identificarTransportadora(normalizado.codigo),
    precisaRevisao: normalizado.precisaRevisao,
    motivoRevisao: normalizado.motivoRevisao,
    origem: "MANUAL",
    criadoEm: agora(),
    atualizadoEm: agora(),
  };

  if (endereco.trim()) {
    definirLocalizacaoPacote(pacote, { endereco });
  }

  return pacote;
}

export function pacotePodeSerMovido(pacote: PacoteDaCarga): boolean {
  return obterEstadoEntrega(pacote).estadoFisico === "PENDENTE";
}

export function adicionarPacoteNaCarga(
  carga: CargaEntregador,
  pacote: PacoteDaCarga,
): void {
  const repetido = carga.pacotes.some(
    (item) => item.codigoNormalizado === pacote.codigoNormalizado,
  );

  if (repetido) {
    throw new Error("Este codigo ja existe nesta carga.");
  }

  if ((carga.status ?? "PUBLICADA") === "ENCERRADA") {
    throw new Error("Nao e possivel alterar uma carga encerrada.");
  }

  carga.pacotes.push(pacote);
}

export function excluirPacoteDaCarga(
  carga: CargaEntregador,
  pacoteId: string,
): PacoteDaCarga {
  const pacote = carga.pacotes.find((item) => item.id === pacoteId);
  if (!pacote) throw new Error("Pacote nao encontrado.");

  if (!pacotePodeSerMovido(pacote)) {
    throw new Error("Este pacote ja entrou em operacao e nao pode ser excluido.");
  }

  carga.pacotes = carga.pacotes.filter((item) => item.id !== pacoteId);
  return pacote;
}

export function transferirPacote(
  origem: CargaEntregador,
  destino: CargaEntregador,
  pacoteId: string,
): void {
  if (origem.entregadorId === destino.entregadorId) {
    throw new Error("Origem e destino sao o mesmo entregador.");
  }

  const pacote = origem.pacotes.find((item) => item.id === pacoteId);
  if (!pacote) throw new Error("Pacote nao encontrado na carga de origem.");

  if (!pacotePodeSerMovido(pacote)) {
    throw new Error("Este pacote ja entrou em operacao e nao pode ser transferido.");
  }

  const duplicadoDestino = destino.pacotes.some(
    (item) => item.codigoNormalizado === pacote.codigoNormalizado,
  );
  if (duplicadoDestino) {
    throw new Error("O entregador de destino ja possui este codigo.");
  }

  origem.pacotes = origem.pacotes.filter((item) => item.id !== pacoteId);
  destino.pacotes.push({
    ...pacote,
    entregador: destino.nomeEntregador,
    origem: "TRANSFERENCIA",
    transferidoDeEntregadorId: origem.entregadorId,
    atualizadoEm: agora(),
  });
}

export function transferirPendentes(
  origem: CargaEntregador,
  destino: CargaEntregador,
): number {
  const candidatos = origem.pacotes.filter(pacotePodeSerMovido);
  let movidos = 0;

  for (const pacote of [...candidatos]) {
    if (destino.pacotes.some((item) => item.codigoNormalizado === pacote.codigoNormalizado)) {
      continue;
    }
    transferirPacote(origem, destino, pacote.id);
    movidos += 1;
  }

  return movidos;
}


export interface ResultadoTransferenciaLote {
  movidos: number;
  bloqueados: number;
  duplicadosDestino: number;
}

export function transferirPacotesSelecionados(
  origem: CargaEntregador,
  destino: CargaEntregador,
  pacoteIds: string[],
): ResultadoTransferenciaLote {
  const ids = new Set(pacoteIds);
  let movidos = 0;
  let bloqueados = 0;
  let duplicadosDestino = 0;

  for (const pacote of [...origem.pacotes]) {
    if (!ids.has(pacote.id)) continue;
    if (!pacotePodeSerMovido(pacote)) {
      bloqueados += 1;
      continue;
    }
    if (destino.pacotes.some((item) => item.codigoNormalizado === pacote.codigoNormalizado)) {
      duplicadosDestino += 1;
      continue;
    }
    transferirPacote(origem, destino, pacote.id);
    movidos += 1;
  }

  return { movidos, bloqueados, duplicadosDestino };
}

export function idsPendentesDaRegiao(
  carga: CargaEntregador,
  regiaoId: string,
): string[] {
  return carga.pacotes
    .filter((pacote) => pacotePodeSerMovido(pacote) && idRegiaoPacote(pacote) === regiaoId)
    .map((pacote) => pacote.id);
}

export function publicarCarga(carga: CargaEntregador): void {
  if (!carga.pacotes.length) {
    throw new Error("Adicione pelo menos um pacote antes de publicar.");
  }
  carga.status = "PUBLICADA";
  carga.publicadaEm = agora();
}

export function encerrarCarga(carga: CargaEntregador): void {
  const emAberto = carga.pacotes.some((pacote) => {
    const estado = obterEstadoEntrega(pacote).estadoFisico;
    return estado !== "ENTREGUE" && estado !== "NAO_ENTREGUE";
  });

  if (emAberto) {
    throw new Error("Existem pacotes ainda nao finalizados nesta carga.");
  }

  carga.status = "ENCERRADA";
  carga.encerradaEm = agora();
}
