import type {
  EstadoBaixaExternaLegado,
  EstadoEntrega,
  EstadoIntegracaoEntrega,
  EventoEntrega,
  MotivoNaoEntrega,
  RecebedorEntrega,
  AssinaturaEntrega,
  TipoEvidenciaFoto,
} from "../dominio/entrega/tipos";
import type { PacoteDaCarga } from "../dominio/carga/tipos";

export function novoEventoEntrega(
  tipo: EventoEntrega["tipo"],
  descricao: string,
): EventoEntrega {
  return {
    id: crypto.randomUUID(),
    tipo,
    criadoEm: new Date().toISOString(),
    descricao,
  };
}

function migrarEstadoIntegracao(
  legado: EstadoBaixaExternaLegado | undefined,
): EstadoIntegracaoEntrega {
  if (!legado || legado === "NAO_INICIADA") return "NAO_INICIADA";
  if (legado === "PREPARADA") return "AGUARDANDO_SINCRONIZACAO";
  if (legado === "ENVIANDO") return "SINCRONIZANDO";
  if (legado === "CONFIRMADA") return "CONFIRMADA";
  if (legado === "ACAO_MANUAL" || legado === "EXIGE_ACAO_MANUAL") {
    return "ACAO_MANUAL";
  }
  if (legado === "ERRO" || legado === "FALHOU") return "ERRO";
  // APP_EXTERNO_ABERTO / ABERTA_NO_APP_EXTERNO indicam que o Hub ja
  // saiu da etapa puramente local, mas ainda nao ha confirmacao final.
  return "AGUARDANDO_INTEGRACAO";
}

export function criarEstadoEntregaPadrao(): EstadoEntrega {
  return {
    estadoFisico: "PENDENTE",
    estadoIntegracao: "NAO_INICIADA",
    fotos: [],
    eventos: [],
  };
}

export function normalizarEstadoEntrega(estado: EstadoEntrega): EstadoEntrega {
  const compatibilidade = estado as EstadoEntrega & {
    estadoIntegracao?: EstadoIntegracaoEntrega;
  };

  if (!compatibilidade.estadoIntegracao) {
    compatibilidade.estadoIntegracao = migrarEstadoIntegracao(
      compatibilidade.estadoBaixaExterna,
    );
  }

  // O campo antigo nao participa mais das novas regras. Mantemos o valor que
  // veio do disco apenas para permitir auditoria/migracao durante a V0.4.x.
  compatibilidade.fotos ??= [];
  compatibilidade.eventos ??= [];
  return compatibilidade;
}

export function obterEstadoEntrega(pacote: PacoteDaCarga): EstadoEntrega {
  if (!pacote.entrega) {
    pacote.entrega = criarEstadoEntregaPadrao();
  }
  return normalizarEstadoEntrega(pacote.entrega);
}

export function iniciarEntrega(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);

  if (entrega.estadoFisico === "ENTREGUE" || entrega.estadoFisico === "NAO_ENTREGUE") return;

  if (entrega.estadoFisico === "PENDENTE") {
    entrega.estadoFisico = "PREPARANDO";
    entrega.iniciadaEm = new Date().toISOString();
    entrega.eventos.push(novoEventoEntrega("INICIADA", "Preparacao da entrega iniciada."));
  }
}

export function pausarEntrega(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);
  if (entrega.estadoFisico !== "PREPARANDO" && entrega.estadoFisico !== "AGUARDANDO_RECEBEDOR") return;

  entrega.eventos.push(novoEventoEntrega("PAUSADA", "Entrega pausada para continuar depois."));
}

export function cancelarPreparacao(pacote: PacoteDaCarga): string[] {
  const entrega = obterEstadoEntrega(pacote);

  if (
    entrega.estadoIntegracao === "CONFIRMADA" ||
    entrega.estadoIntegracao === "AGUARDANDO_INTEGRACAO" ||
    entrega.estadoIntegracao === "SINCRONIZANDO"
  ) {
    throw new Error("A operacao ja saiu do aparelho. Use o fluxo de correcao.");
  }

  const arquivos = entrega.fotos.map((foto) => foto.chaveArquivo);
  if (entrega.assinatura?.chaveArquivo) arquivos.push(entrega.assinatura.chaveArquivo);

  pacote.entrega = {
    ...criarEstadoEntregaPadrao(),
    eventos: [
      ...entrega.eventos,
      novoEventoEntrega("CANCELADA", "Preparacao cancelada e pacote devolvido para pendente."),
    ],
  };

  return arquivos;
}

export function definirRecebedor(
  pacote: PacoteDaCarga,
  recebedor: RecebedorEntrega,
): void {
  const entrega = obterEstadoEntrega(pacote);
  const mudou = JSON.stringify(entrega.recebedor) !== JSON.stringify(recebedor);
  entrega.recebedor = recebedor;
  entrega.estadoFisico = "AGUARDANDO_RECEBEDOR";
  if (mudou) {
    entrega.eventos.push(
      novoEventoEntrega("RECEBEDOR_INFORMADO", `Recebedor definido: ${recebedor.tipo}.`),
    );
  }
}

export function adicionarFoto(
  pacote: PacoteDaCarga,
  foto: EstadoEntrega["fotos"][number],
): string | null {
  const entrega = obterEstadoEntrega(pacote);
  const anterior = entrega.fotos.find((item) => item.tipo === foto.tipo);

  entrega.fotos = [
    ...entrega.fotos.filter((item) => item.tipo !== foto.tipo),
    foto,
  ];

  entrega.eventos.push(
    novoEventoEntrega("FOTO_ADICIONADA", `Foto ${foto.tipo.toLowerCase()} registrada.`),
  );

  return anterior?.chaveArquivo ?? null;
}

export function removerFoto(
  pacote: PacoteDaCarga,
  tipo: TipoEvidenciaFoto,
): string | null {
  const entrega = obterEstadoEntrega(pacote);
  const foto = entrega.fotos.find((item) => item.tipo === tipo);
  if (!foto) return null;

  entrega.fotos = entrega.fotos.filter((item) => item.tipo !== tipo);
  entrega.eventos.push(
    novoEventoEntrega("FOTO_REMOVIDA", `Foto ${tipo.toLowerCase()} removida.`),
  );
  return foto.chaveArquivo;
}

export function definirAssinatura(
  pacote: PacoteDaCarga,
  assinatura: AssinaturaEntrega,
): string | null {
  const entrega = obterEstadoEntrega(pacote);
  const chaveAnterior = entrega.assinatura?.chaveArquivo ?? null;
  entrega.assinatura = assinatura;
  entrega.eventos.push(
    novoEventoEntrega("ASSINATURA_ADICIONADA", "Assinatura registrada no aparelho."),
  );
  return chaveAnterior;
}

export function removerAssinatura(pacote: PacoteDaCarga): string | null {
  const entrega = obterEstadoEntrega(pacote);
  const chave = entrega.assinatura?.chaveArquivo ?? null;
  if (!chave) return null;
  entrega.assinatura = undefined;
  entrega.eventos.push(
    novoEventoEntrega("ASSINATURA_REMOVIDA", "Assinatura removida do aparelho."),
  );
  return chave;
}

export function confirmarEntrega(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);

  if (!entrega.recebedor) {
    throw new Error("Informe quem recebeu antes de concluir a entrega.");
  }

  entrega.ultimaAcaoDesfazivel = {
    estadoFisicoAnterior: entrega.estadoFisico,
    motivoNaoEntregaAnterior: entrega.motivoNaoEntrega,
    concluidaEm: entrega.concluidaEm,
  };

  entrega.estadoFisico = "ENTREGUE";
  entrega.motivoNaoEntrega = undefined;
  entrega.concluidaEm = new Date().toISOString();
  entrega.estadoIntegracao = "AGUARDANDO_SINCRONIZACAO";
  entrega.ultimoErroIntegracao = undefined;
  entrega.eventos.push(novoEventoEntrega("ENTREGUE", "Entrega fisica confirmada."));
}

export function marcarNaoEntregue(
  pacote: PacoteDaCarga,
  motivo: MotivoNaoEntrega,
): void {
  const entrega = obterEstadoEntrega(pacote);

  entrega.ultimaAcaoDesfazivel = {
    estadoFisicoAnterior: entrega.estadoFisico,
    motivoNaoEntregaAnterior: entrega.motivoNaoEntrega,
    concluidaEm: entrega.concluidaEm,
  };

  entrega.estadoFisico = "NAO_ENTREGUE";
  entrega.motivoNaoEntrega = motivo;
  entrega.concluidaEm = new Date().toISOString();
  entrega.estadoIntegracao = "AGUARDANDO_SINCRONIZACAO";
  entrega.ultimoErroIntegracao = undefined;
  entrega.eventos.push(
    novoEventoEntrega("NAO_ENTREGUE", `Entrega nao realizada: ${motivo}.`),
  );
}

export function desfazerUltimaConclusao(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);

  if (
    entrega.estadoIntegracao === "CONFIRMADA" ||
    entrega.estadoIntegracao === "AGUARDANDO_INTEGRACAO" ||
    entrega.estadoIntegracao === "SINCRONIZANDO"
  ) {
    throw new Error("A operacao ja saiu do aparelho. Use o fluxo de correcao.");
  }

  const anterior = entrega.ultimaAcaoDesfazivel;
  if (!anterior) {
    throw new Error("Nao existe uma acao recente para desfazer.");
  }

  entrega.estadoFisico = anterior.estadoFisicoAnterior;
  entrega.motivoNaoEntrega = anterior.motivoNaoEntregaAnterior;
  entrega.concluidaEm = anterior.concluidaEm;
  entrega.estadoIntegracao = "NAO_INICIADA";
  entrega.operacaoIntegracaoId = undefined;
  entrega.ultimoErroIntegracao = undefined;
  entrega.ultimaAcaoDesfazivel = undefined;
  entrega.eventos.push(novoEventoEntrega("DESFEITA", "Ultima conclusao local desfeita."));
}
