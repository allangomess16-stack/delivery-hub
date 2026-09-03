import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaLogin(mensagem = "") {
  return `
    ${cabecalhoFixo("Delivery Hub", "Identificacao")}
    <main class="conteudo conteudo--centro">
      <section class="painel-destaque painel-login">
        <span class="etiqueta-status">V0.2.3 • PERFIS COM ACESSO</span>
        <h1>Entrar</h1>
        <p>Cada entregador entra com o email definido no seu proprio perfil.</p>

        <form id="form-login" class="form-login">
          <label class="campo-grande">
            <span>EMAIL</span>
            <input id="login-email" type="email" autocomplete="username" required placeholder="email@exemplo.com" />
          </label>
          <label class="campo-grande">
            <span>SENHA</span>
            <input id="login-senha" type="password" autocomplete="current-password" required placeholder="Senha" />
          </label>
          ${mensagem ? `<div class="mensagem-operacao mensagem-operacao--erro">${escaparHtml(mensagem)}</div>` : ""}
          <button class="botao-acao botao-acao--primario" type="submit">ENTRAR</button>
        </form>

        <div class="credenciais-dev">
          <strong>AMBIENTE LOCAL</strong>
          <span>Admin: admin@deliveryhub.local / admin123</span>
          <span>Perfil teste: entregador@deliveryhub.local / entrega123</span>
          <span>Novos entregadores usam o email e a senha cadastrados em Gerenciar Perfis.</span>
        </div>
      </section>
    </main>
  `;
}
