import type { ContaAcessoEntregador, PerfilEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export interface ResumoPerfilAdmin {
  perfil: PerfilEntregador;
  conta: ContaAcessoEntregador | null;
  quantidadeCargas: number;
}

export function telaAdminPerfis(perfis: ResumoPerfilAdmin[]) {
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Perfis de entregadores")}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ADMINISTRACAO</span>
        <h1>Perfis e acessos</h1>
        <p>Cada entregador deve ter exatamente um perfil operacional e uma conta de acesso vinculada ao mesmo ID.</p>
      </section>

      <button id="novo-perfil" class="botao-acao botao-acao--primario botao-largura-total">CRIAR NOVO PERFIL</button>

      <section class="lista-perfis-admin">
        ${perfis.length ? perfis.map(({ perfil, conta, quantidadeCargas }) => `
          <article class="perfil-admin-card ${perfil.ativo ? "" : "perfil-admin-card--inativo"}">
            <div class="perfil-admin-card__topo">
              <div>
                <span class="sobrelinha">${perfil.ativo ? "ATIVO" : "INATIVO"}</span>
                <strong>${escaparHtml(perfil.nomeOficial)}</strong>
                <small>${escaparHtml(perfil.entregadorId)}</small>
              </div>
              <b>${quantidadeCargas}<small>cargas</small></b>
            </div>

            <div class="perfil-acesso ${conta ? "perfil-acesso--ok" : "perfil-acesso--erro"}">
              <span>ACESSO</span>
              <strong>${conta ? escaparHtml(conta.email) : "SEM CONTA DE ACESSO"}</strong>
              <small>${conta ? (conta.ativo ? "Login habilitado" : "Login desabilitado") : "Edite o perfil para criar o login"}</small>
            </div>

            <div class="perfil-aliases">
              ${perfil.excelAliases.map((alias) => `<span>${escaparHtml(alias)}</span>`).join("")}
            </div>
            <div class="perfil-admin-card__acoes">
              <button class="botao-mini botao-mini--primario" data-editar-perfil="${escaparHtml(perfil.entregadorId)}">EDITAR</button>
              <button class="botao-mini" data-alternar-perfil="${escaparHtml(perfil.entregadorId)}" data-ativo="${perfil.ativo}">${perfil.ativo ? "DESATIVAR" : "ATIVAR"}</button>
              <button class="botao-mini botao-mini--perigo" data-excluir-perfil="${escaparHtml(perfil.entregadorId)}">EXCLUIR</button>
            </div>
          </article>
        `).join("") : `
          <div class="estado-vazio estado-vazio--grande">
            <strong>Nenhum perfil cadastrado</strong>
            <span>Crie o primeiro perfil de entregador.</span>
          </div>
        `}
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-admin" class="botao-acao botao-acao--secundario">VOLTAR</button>
    </footer>
  `;
}
