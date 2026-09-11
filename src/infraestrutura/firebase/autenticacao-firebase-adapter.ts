import type { Auth } from "firebase/auth";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { ServicoAutenticacao } from "../../aplicacao/portas/servico-autenticacao";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { obterUsuarioFirebase } from "./usuario-firebase";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";

function aguardarEstadoInicial(auth: Auth): Promise<void> {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, () => {
      cancelar();
      resolve();
    });
  });
}

export class AutenticacaoFirebaseAdapter implements ServicoAutenticacao {
  private persistenciaPreparada?: Promise<void>;

  constructor(
    private readonly auth: Auth,
    private readonly rest: ClienteRealtimeRest,
  ) {}

  private prepararPersistencia(): Promise<void> {
    if (!this.persistenciaPreparada) {
      this.persistenciaPreparada = setPersistence(this.auth, browserLocalPersistence);
    }
    return this.persistenciaPreparada;
  }

  async obterUsuarioAtual(): Promise<UsuarioAtual | null> {
    await this.prepararPersistencia();
    await aguardarEstadoInicial(this.auth);

    const usuario = await obterUsuarioFirebase(this.auth, this.rest);
    if (!usuario && this.auth.currentUser) {
      await signOut(this.auth);
    }
    return usuario;
  }

  async entrar(email: string, senha: string): Promise<UsuarioAtual> {
    await this.prepararPersistencia();

    await signInWithEmailAndPassword(
      this.auth,
      email.trim().toLowerCase(),
      senha,
    );

    const usuario = await obterUsuarioFirebase(this.auth, this.rest);
    if (!usuario) {
      await signOut(this.auth);
      throw new Error("Conta sem perfil ativo no Delivery Hub.");
    }

    return usuario;
  }

  async solicitarRedefinicaoSenha(email: string): Promise<void> {
    const normalizado = email.trim().toLowerCase();
    if (!normalizado || !normalizado.includes("@")) {
      throw new Error("Informe um email valido para redefinicao.");
    }
    this.auth.languageCode = "pt-BR";
    await sendPasswordResetEmail(this.auth, normalizado);
  }

  async sair(): Promise<void> {
    await signOut(this.auth);
  }
}
