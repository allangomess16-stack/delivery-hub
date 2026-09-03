import type { ServicoAutenticacao } from "../../aplicacao/portas/servico-autenticacao";
import type { ContaAcessoEntregador, UsuarioAtual } from "../../dominio/identidade/tipos";
import { USUARIO_ADMIN_TESTE, USUARIO_ENTREGADOR_TESTE } from "./usuarios-teste";

const CHAVE_SESSAO = "delivery-hub:dev:sessao:v2";

interface RespostaLogin {
  ok: boolean;
  usuario?: UsuarioAtual;
  erro?: string;
}

interface RespostaConta {
  ok: boolean;
  conta?: ContaAcessoEntregador;
}

function salvarSessao(usuario: UsuarioAtual): UsuarioAtual {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
  return usuario;
}

/**
 * Autenticacao de desenvolvimento.
 *
 * - Admin: conta de teste fixa no servidor local.
 * - Entregadores: contas criadas pelo Admin e vinculadas por entregadorId.
 * - Sessao: local por navegador, como ocorrera com Firebase Auth no futuro.
 */
export class AutenticacaoLocalAdapter implements ServicoAutenticacao {
  async obterUsuarioAtual(): Promise<UsuarioAtual | null> {
    const salvo = localStorage.getItem(CHAVE_SESSAO);
    if (!salvo) return null;

    let usuario: UsuarioAtual;
    try {
      usuario = JSON.parse(salvo) as UsuarioAtual;
    } catch {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }

    if (usuario.tipo === "ADMIN") return usuario;
    if (!usuario.entregadorId) {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }

    // Revalida a associacao quando o servidor esta acessivel. Se o aparelho
    // estiver offline, preserva a sessao existente para nao bloquear a rota.
    try {
      const resposta = await fetch(
        `/api/accounts?courierId=${encodeURIComponent(usuario.entregadorId)}`,
        { cache: "no-store" },
      );
      if (resposta.status === 404) {
        localStorage.removeItem(CHAVE_SESSAO);
        return null;
      }
      if (!resposta.ok) return usuario;
      const dados = (await resposta.json()) as RespostaConta;
      if (!dados.conta?.ativo) {
        localStorage.removeItem(CHAVE_SESSAO);
        return null;
      }

      const atualizado: UsuarioAtual = {
        ...usuario,
        usuarioId: dados.conta.usuarioId,
        email: dados.conta.email,
        entregadorId: dados.conta.entregadorId,
      };
      return salvarSessao(atualizado);
    } catch {
      return usuario;
    }
  }

  async entrar(email: string, senha: string): Promise<UsuarioAtual> {
    const emailNormalizado = email.trim().toLowerCase();

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalizado, senha }),
      });

      const dados = (await resposta.json()) as RespostaLogin;
      if (!resposta.ok || !dados.usuario) {
        throw new Error(dados.erro || "Email ou senha invalidos.");
      }
      return salvarSessao(dados.usuario);
    } catch (erro) {
      // Fallback apenas para permitir desenvolvimento pelo Vite sem o servidor
      // compartilhado. Contas criadas pelo Admin exigem BAT\\01_SERVIDOR_LOCAL.bat.
      const fixos = [USUARIO_ADMIN_TESTE, USUARIO_ENTREGADOR_TESTE];
      const fixo = fixos.find(
        (item) => item.email.toLowerCase() === emailNormalizado && item.senha === senha,
      );
      if (fixo) return salvarSessao(structuredClone(fixo.usuario));
      throw erro instanceof Error ? erro : new Error("Falha ao autenticar.");
    }
  }

  async sair(): Promise<void> {
    localStorage.removeItem(CHAVE_SESSAO);
  }
}
