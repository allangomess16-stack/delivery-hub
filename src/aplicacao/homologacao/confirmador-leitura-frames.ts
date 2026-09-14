import {
  analisarCodigosEtiqueta,
  type AnaliseEtiquetaHomologacao,
  type CodigoEtiquetaAnalisado,
} from "./analisar-etiqueta";

export interface ProgressoConfirmacaoLeitura {
  confirmado: boolean;
  leituras: number;
  necessarias: number;
  candidato: CodigoEtiquetaAnalisado | null;
  analise: AnaliseEtiquetaHomologacao | null;
}

interface RegistroCodigo {
  item: CodigoEtiquetaAnalisado;
  leituras: number;
  ultimaLeituraEm: number;
}

/**
 * Confirma uma leitura somente depois de reencontrar o mesmo codigo em quadros
 * diferentes. Isso evita concluir a entrega por um frame borrado/isolado.
 */
export class ConfirmadorLeituraFrames {
  private readonly registros = new Map<string, RegistroCodigo>();

  constructor(
    private readonly leiturasNecessarias = 2,
    private readonly janelaMs = 2_500,
  ) {}

  registrar(
    codigosBrutos: string[],
    agora = Date.now(),
  ): ProgressoConfirmacaoLeitura {
    const analise = analisarCodigosEtiqueta(codigosBrutos);
    this.removerExpirados(agora);

    for (const item of analise.codigos) {
      const atual = this.registros.get(item.normalizado);
      this.registros.set(item.normalizado, {
        item,
        leituras: atual ? atual.leituras + 1 : 1,
        ultimaLeituraEm: agora,
      });
    }

    const registrosAtivos = [...this.registros.values()];
    const conhecidosConfirmados = registrosAtivos.filter(
      (registro) =>
        registro.item.conhecido &&
        registro.leituras >= this.leiturasNecessarias,
    );

    if (conhecidosConfirmados.length === 1) {
      const candidato = conhecidosConfirmados[0];
      return {
        confirmado: true,
        leituras: candidato.leituras,
        necessarias: this.leiturasNecessarias,
        candidato: candidato.item,
        analise: {
          ...analise,
          principal: candidato.item,
          exigeEscolha: false,
        },
      };
    }

    if (conhecidosConfirmados.length > 1) {
      const confirmados = conhecidosConfirmados.map((registro) => registro.item);
      return {
        confirmado: true,
        leituras: Math.max(...conhecidosConfirmados.map((item) => item.leituras)),
        necessarias: this.leiturasNecessarias,
        candidato: null,
        analise: {
          codigos: confirmados,
          principal: null,
          exigeEscolha: true,
          aviso:
            "Mais de um tracking conhecido foi confirmado. Escolha o codigo principal impresso na etiqueta.",
        },
      };
    }

    const conhecidosAindaNaoConfirmados = registrosAtivos.filter(
      (registro) => registro.item.conhecido,
    );

    const candidatos = conhecidosAindaNaoConfirmados.length
      ? conhecidosAindaNaoConfirmados
      : registrosAtivos;

    const melhor = candidatos.sort((a, b) => b.leituras - a.leituras)[0] ?? null;

    if (
      melhor &&
      !melhor.item.conhecido &&
      melhor.leituras >= this.leiturasNecessarias
    ) {
      return {
        confirmado: true,
        leituras: melhor.leituras,
        necessarias: this.leiturasNecessarias,
        candidato: melhor.item,
        analise: {
          ...analise,
          principal: melhor.item,
          exigeEscolha: false,
        },
      };
    }

    return {
      confirmado: false,
      leituras: melhor?.leituras ?? 0,
      necessarias: this.leiturasNecessarias,
      candidato: melhor?.item ?? null,
      analise,
    };
  }

  limpar(): void {
    this.registros.clear();
  }

  private removerExpirados(agora: number): void {
    for (const [codigo, registro] of this.registros) {
      if (agora - registro.ultimaLeituraEm > this.janelaMs) {
        this.registros.delete(codigo);
      }
    }
  }
}
