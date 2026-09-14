import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaSelecaoTransportadoraManual(nomeEntregador: string, tracking: string): string {
  return `
    ${cabecalhoFixo(nomeEntregador, "Confirmar transportadora")}
    <main class="conteudo conteudo--com-rodape">
      <section class="resultado-entrega resultado-entrega--atencao resultado-entrega--compacto">
        <span class="resultado-entrega__icone">?</span>
        <span class="sobrelinha">ETIQUETA LIDA</span>
        <h1>Qual é a transportadora?</h1>
        <strong class="codigo-destaque">${escaparHtml(tracking)}</strong>
        <p>O padrão não foi confirmado. Selecione somente após conferir a etiqueta.</p>
      </section>
      <section class="grade-escolhas" aria-label="Transportadoras disponíveis">
        <button class="botao-escolha" data-transportadora-manual="IMILE"><strong>iMile</strong><span>Abrir pesquisa assistida</span></button>
        <button class="botao-escolha" data-transportadora-manual="ANJUN"><strong>Anjun</strong><span>Registrar POD no Hub</span></button>
        <button class="botao-escolha" data-transportadora-manual="JNT"><strong>J&amp;T Express</strong><span>Registrar POD no Hub</span></button>
      </section>
      <p class="texto-apoio">A escolha fica marcada como manual para o suporte; ela não cria uma nova regra de leitura.</p>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica"><button id="voltar-scanner-manual" class="botao-acao botao-acao--secundario">VOLTAR AO SCANNER</button></footer>
  `;
}
