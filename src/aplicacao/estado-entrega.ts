import type {
  EstadoEntrega,
  EventoEntrega,
  MotivoNaoEntrega,
  RecebedorEntrega,
  TipoEvidenciaFoto,
} from "../dominio/entrega/tipos";
import type { PacoteDaCarga } from "../dominio/carga/tipos";

function novoEvento(tipo: EventoEntrega["tipo"], descricao: string): EventoEntrega {
  return {
    id: crypto.randomUUID(),
    tipo,
    criadoEm: new Date().toISOString(),
    descricao,
  };
}

export function criarEstadoEntregaPadrao(): EstadoEntrega {
  return {
    estadoFisico: "PENDENTE",
    estadoBaixaExterna: "NAO_INICIADA",
    fotos: [],
    eventos: [],
  };
}

export function obterEstadoEntrega(pacote: PacoteDaCarga): EstadoEntrega {
  if (!pacote.entrega) {
    pacote.entrega = criarEstadoEntregaPadrao();
  }
  return pacote.entrega;
}

export function iniciarEntrega(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);

  if (entrega.estadoFisico === "ENTREGUE" || entrega.estadoFisico === "NAO_ENTREGUE") return;

  if (entrega.estadoFisico === "PENDENTE") {
    entrega.estadoFisico = "PREPARANDO";
    entrega.iniciadaEm = new Date().toISOString();
    entrega.eventos.push(novoEvento("INICIADA", "Preparacao da entrega iniciada."));
  }
}

export function pausarEntrega(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);
  if (entrega.estadoFisico !== "PREPARANDO" && entrega.estadoFisico !== "AGUARDANDO_RECEBEDOR") return;

  entrega.eventos.push(novoEvento("PAUSADA", "Entrega pausada para continuar depois."));
}

export function cancelarPreparacao(pacote: PacoteDaCarga): string[] {
  const entrega = obterEstadoEntrega(pacote);

  if (entrega.estadoBaixaExterna === "CONFIRMADA") {
    throw new Error("A baixa externa ja foi confirmada. Nao e possivel cancelar localmente.");
  }

  const arquivos = entrega.fotos.map((foto) => foto.chaveArquivo);

  pacote.entrega = {
    ...criarEstadoEntregaPadrao(),
    eventos: [
      ...entrega.eventos,
      novoEvento("CANCELADA", "Preparacao cancelada e pacote devolvido para pendente."),
    ],
  };

  return arquivos;
}

export function definirRecebedor(
  pacote: PacoteDaCarga,
  recebedor: RecebedorEntrega,
): void {
  const entrega = obterEstadoEntrega(pacote);
  entrega.recebedor = recebedor;
  entrega.estadoFisico = "AGUARDANDO_RECEBEDOR";
  entrega.eventos.push(
    novoEvento("RECEBEDOR_INFORMADO", `Recebedor definido: ${recebedor.tipo}.`),
  );
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
    novoEvento("FOTO_ADICIONADA", `Foto ${foto.tipo.toLowerCase()} registrada.`),
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
    novoEvento("FOTO_REMOVIDA", `Foto ${tipo.toLowerCase()} removida.`),
  );
  return foto.chaveArquivo;
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
  entrega.estadoBaixaExterna = "PREPARADA";
  entrega.eventos.push(novoEvento("ENTREGUE", "Entrega fisica confirmada."));
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
  entrega.estadoBaixaExterna = "PREPARADA";
  entrega.eventos.push(
    novoEvento("NAO_ENTREGUE", `Entrega nao realizada: ${motivo}.`),
  );
}

export function desfazerUltimaConclusao(pacote: PacoteDaCarga): void {
  const entrega = obterEstadoEntrega(pacote);

  if (entrega.estadoBaixaExterna === "CONFIRMADA") {
    throw new Error("A baixa externa ja foi confirmada. Use o fluxo de correcao.");
  }

  const anterior = entrega.ultimaAcaoDesfazivel;
  if (!anterior) {
    throw new Error("Nao existe uma acao recente para desfazer.");
  }

  entrega.estadoFisico = anterior.estadoFisicoAnterior;
  entrega.motivoNaoEntrega = anterior.motivoNaoEntregaAnterior;
  entrega.concluidaEm = anterior.concluidaEm;
  entrega.estadoBaixaExterna = "NAO_INICIADA";
  entrega.ultimaAcaoDesfazivel = undefined;
  entrega.eventos.push(novoEvento("DESFEITA", "Ultima conclusao local desfeita."));
}
