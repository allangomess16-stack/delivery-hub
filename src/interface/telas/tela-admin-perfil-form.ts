import type { ContaAcessoEntregador, PerfilEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaAdminPerfilForm(
  perfil?: PerfilEntregador,
  conta?: ContaAcessoEntregador | null,
  aliasInicial = "",
) {
  const editando = Boolean(perfil);
  const aliases = perfil?.excelAliases ?? (aliasInicial ? [aliasInicial] : []);
  const senhaObrigatoria = !conta;

  return `
    ${cabecalhoFixo("Delivery Hub • Admin", editando ? "Editar perfil" : "Novo perfil")}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">${editando ? escaparHtml(perfil!.entregadorId) : "NOVO ENTREGADOR"}</span>
        <h1>${editando ? "Perfil e acesso" : "Criar perfil"}</h1>
        <p>O perfil identifica a carga. O email identifica quem pode entrar nesse perfil.</p>
      </section>

      <form id="form-perfil" class="form-perfil-admin">
        <label class="campo-grande">
          <span>NOME OFICIAL</span>
          <input id="perfil-nome" required autocomplete="off" value="${escaparHtml(perfil?.nomeOficial ?? aliasInicial)}" placeholder="Ex.: Roberto Silva" />
        </label>

        <label class="campo-grande">
          <span>${conta ? "EMAIL CADASTRADO" : "EMAIL DE ACESSO"}</span>
          <input id="perfil-email" type="email" required autocomplete="off" value="${escaparHtml(conta?.email ?? "")}" placeholder="roberto@email.com" ${conta ? "readonly" : ""} />
        </label>

        ${senhaObrigatoria ? `
          <label class="campo-grande">
            <span>SENHA INICIAL</span>
            <input id="perfil-senha" type="password" required autocomplete="new-password" placeholder="Minimo 6 caracteres" />
          </label>
        ` : `
          <div class="nota-operacao">
            <strong>Senha de acesso</strong>
            <span>Por seguranca, o Admin nao visualiza nem define a senha atual. Envie um link de redefinicao ao email cadastrado.</span>
            <button id="enviar-redefinicao-senha" type="button" class="botao-mini botao-mini--primario">ENVIAR REDEFINICAO</button>
          </div>
        `}

        <label class="campo-grande">
          <span>ALIASES DO EXCEL</span>
          <textarea id="perfil-aliases" required rows="6" placeholder="ROBERTO\nROBERTO S.\nROB SILVA">${escaparHtml(aliases.join("\n"))}</textarea>
        </label>

        <label class="controle-ativo">
          <input id="perfil-ativo" type="checkbox" ${perfil?.ativo === false ? "" : "checked"} />
          <span>Perfil ativo para login e novas cargas</span>
        </label>

        <div class="nota-operacao">
          <strong>Vinculo de acesso</strong>
          <span>${conta ? "A troca do email exige um fluxo de suporte autenticado; aqui voce pode redefinir a senha sem alterar o historico." : "O email fica ligado ao ID operacional do perfil e nao altera as cargas nem o historico."}</span>
        </div>

        <button type="submit" class="botao-acao botao-acao--sucesso botao-largura-total">SALVAR PERFIL E ACESSO</button>
      </form>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="cancelar-perfil" class="botao-acao botao-acao--secundario">CANCELAR</button>
    </footer>
  `;
}
