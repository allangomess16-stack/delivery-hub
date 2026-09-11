import type { RepositorioOperacoesScanner } from "../../aplicacao/portas/repositorio-operacoes-scanner";
import type {
  EstadoEncaminhamentoScanner,
  RegistroOperacaoScanner,
  ResultadoScannerUniversal,
} from "../../dominio/scanner/tipos";
import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";
import { obterDataLocalIso } from "../../aplicacao/tempo/data-local";

const PREFIXO = "scanner-operacao:";

function chaveRegistro(entregadorId: string, diaOperacao: string, tracking: string): string {
  return `${PREFIXO}${entregadorId}:${diaOperacao}:${tracking}`;
}

export class RepositorioOperacoesScannerIndexedDb implements RepositorioOperacoesScanner {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async registrarLeitura(
    entregadorId: string,
    leitura: ResultadoScannerUniversal,
  ): Promise<RegistroOperacaoScanner> {
    const diaOperacao = obterDataLocalIso();
    const registroId = chaveRegistro(entregadorId, diaOperacao, leitura.tracking);
    const existente = await this.armazenamento.obter<RegistroOperacaoScanner>(registroId);
    const agora = new Date().toISOString();
    const registro: RegistroOperacaoScanner = {
      registroId,
      entregadorId,
      diaOperacao,
      tracking: leitura.tracking,
      transportadoraId: leitura.transportadora.id,
      origem: leitura.origem,
      cargaId: leitura.cargaId,
      pacoteId: leitura.pacote?.id,
      primeiraLeituraEm: existente?.primeiraLeituraEm ?? agora,
      ultimaLeituraEm: agora,
      tentativas: (existente?.tentativas ?? 0) + 1,
      estado: "PENDENTE",
      codigoResultado: undefined,
    };
    await this.armazenamento.salvar(registroId, registro);
    return registro;
  }

  async registrarResultado(
    registroId: string,
    estado: EstadoEncaminhamentoScanner,
    codigoResultado?: string,
  ): Promise<void> {
    const existente = await this.armazenamento.obter<RegistroOperacaoScanner>(registroId);
    if (!existente) return;
    await this.armazenamento.salvar(registroId, {
      ...existente,
      estado,
      codigoResultado,
      ultimaLeituraEm: new Date().toISOString(),
    });
  }

  async listarDia(entregadorId: string, diaOperacao: string): Promise<RegistroOperacaoScanner[]> {
    const prefixo = `${PREFIXO}${entregadorId}:${diaOperacao}:`;
    const registros = await this.armazenamento.listar<RegistroOperacaoScanner>(prefixo);
    return registros.map((item) => item.valor)
      .sort((a, b) => b.ultimaLeituraEm.localeCompare(a.ultimaLeituraEm));
  }
}
