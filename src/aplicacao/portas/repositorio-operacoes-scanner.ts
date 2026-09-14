import type {
  EstadoEncaminhamentoScanner,
  RegistroOperacaoScanner,
  ResultadoScannerUniversal,
} from "../../dominio/scanner/tipos";

export interface RepositorioOperacoesScanner {
  registrarLeitura(
    entregadorId: string,
    leitura: ResultadoScannerUniversal,
  ): Promise<RegistroOperacaoScanner>;
  registrarResultado(
    registroId: string,
    estado: EstadoEncaminhamentoScanner,
    codigoResultado?: string,
  ): Promise<void>;
  listarDia(entregadorId: string, diaOperacao: string): Promise<RegistroOperacaoScanner[]>;
}
