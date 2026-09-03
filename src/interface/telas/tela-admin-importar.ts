import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaAdminImportar(usuario: UsuarioAtual, compartilhado: boolean) {
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", escaparHtml(usuario.nome))}
    <main class="conteudo conteudo--com-rodape">
      <div class="status-compartilhamento ${compartilhado ? "status-compartilhamento--ok" : "status-compartilhamento--local"}">
        <strong>${compartilhado ? "DADOS COMPARTILHADOS ATIVOS" : "MODO LOCAL"}</strong>
        <span>${compartilhado ? "Outros navegadores e celulares neste servidor recebem as mesmas cargas." : "Abra pelo BAT\\01_SERVIDOR_LOCAL.bat para compartilhar cargas entre aparelhos."}</span>
      </div>

      <section class="painel-destaque">
        <span class="etiqueta-status">ADMINISTRACAO DA CARGA</span>
        <h1>Importar carga do dia</h1>
        <p>Importe o Excel uma unica vez. Antes de distribuir, o sistema confere qual perfil pertence a cada coluna.</p>

        <label class="botao-acao botao-acao--primario" for="arquivo-planilha"><span>IMPORTAR PLANILHA</span></label>
        <input id="arquivo-planilha" class="arquivo-escondido" type="file" accept=".xlsx,.xls" />

        <button id="gerenciar-cargas" class="botao-acao botao-acao--primario botao-largura-total">GERENCIAR CARGAS</button>
        <button id="gerenciar-perfis" class="botao-acao botao-acao--secundario botao-largura-total">GERENCIAR PERFIS</button>
        <button id="gerenciar-integracoes" class="botao-acao botao-acao--secundario botao-largura-total">INTEGRACOES ANDROID</button>

        <div class="lista-curta">
          <div><b>1</b><span>Leitura e classificacao</span></div>
          <div><b>2</b><span>Conciliacao com perfis</span></div>
          <div><b>3</b><span>Separacao automatica das cargas</span></div>
        </div>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
    </footer>
  `;
}
