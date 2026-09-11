import type {
  CargaImportada,
  ResumoEntregador,
  ResumoTransportadora,
} from "../dominio/carga/tipos";

export function resumirTransportadoras(carga: CargaImportada): ResumoTransportadora[] {
  const totais = new Map<string, ResumoTransportadora>();

  for (const pacote of carga.pacotes) {
    const chave = pacote.transportadora.id;
    const atual = totais.get(chave) ?? {
      id: chave,
      nome: pacote.transportadora.nome,
      quantidade: 0,
    };
    atual.quantidade += 1;
    totais.set(chave, atual);
  }

  return [...totais.values()].sort((a, b) => b.quantidade - a.quantidade);
}

export function resumirEntregadores(carga: CargaImportada): ResumoEntregador[] {
  return carga.entregadores
    .map((nome) => {
      const pacotes = carga.pacotes.filter((pacote) => pacote.entregador === nome);
      const porTransportadora = new Map<string, ResumoTransportadora>();

      for (const pacote of pacotes) {
        const chave = pacote.transportadora.id;
        const atual = porTransportadora.get(chave) ?? {
          id: chave,
          nome: pacote.transportadora.nome,
          quantidade: 0,
        };
        atual.quantidade += 1;
        porTransportadora.set(chave, atual);
      }

      return {
        nome,
        total: pacotes.length,
        transportadoras: [...porTransportadora.values()].sort(
          (a, b) => b.quantidade - a.quantidade,
        ),
      };
    })
    .sort((a, b) => b.total - a.total);
}
