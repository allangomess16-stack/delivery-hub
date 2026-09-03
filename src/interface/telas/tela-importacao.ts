import { cabecalhoFixo } from "../componentes/cabecalho";

export function telaImportacao() {
  return `
    ${cabecalhoFixo("Delivery Hub", "Importar carga")}

    <main class="conteudo conteudo--centro">
      <section class="painel-destaque">
        <span class="etiqueta-status">FASE 01</span>
        <h1>Carga do dia</h1>
        <p>Importe a planilha recebida da operacao. Cada coluna sera tratada como um entregador.</p>

        <label class="botao-acao botao-acao--primario" for="arquivo-planilha">
          <span>IMPORTAR PLANILHA</span>
        </label>
        <input id="arquivo-planilha" class="arquivo-escondido" type="file" accept=".xlsx,.xls" />

        <div class="lista-curta">
          <div><b>1</b><span>Leitura do Excel</span></div>
          <div><b>2</b><span>Identificacao da transportadora</span></div>
          <div><b>3</b><span>Conferencia de duplicidades</span></div>
        </div>
      </section>
    </main>
  `;
}
