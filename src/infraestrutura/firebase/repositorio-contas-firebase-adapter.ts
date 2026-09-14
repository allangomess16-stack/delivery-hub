import {
  deleteApp,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import {
  Database,
  equalTo,
  get,
  orderByChild,
  query,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import type {
  DadosSalvarContaAcesso,
  RepositorioContasAcesso,
} from "../../aplicacao/portas/repositorio-contas-acesso";
import type { ContaAcessoEntregador } from "../../dominio/identidade/tipos";

interface RegistroUsuario {
  email: string;
  nome: string;
  tipo: "ADMIN" | "ENTREGADOR";
  ativo: boolean;
  entregadorId?: string;
  criadoEm: string;
  atualizadoEm: string;
}

function mapear(uid: string, registro: RegistroUsuario): ContaAcessoEntregador {
  return {
    usuarioId: uid,
    entregadorId: registro.entregadorId ?? "",
    email: registro.email,
    ativo: registro.ativo,
    criadoEm: registro.criadoEm,
    atualizadoEm: registro.atualizadoEm,
  };
}

export class RepositorioContasFirebaseAdapter implements RepositorioContasAcesso {
  constructor(
    private readonly firebaseOptions: FirebaseOptions,
    private readonly database: Database,
  ) {}

  async listar(): Promise<ContaAcessoEntregador[]> {
    const snapshot = await get(ref(this.database, "usuarios"));
    if (!snapshot.exists()) return [];

    const usuarios = snapshot.val() as Record<string, RegistroUsuario>;
    return Object.entries(usuarios)
      .filter(([, item]) => item.tipo === "ENTREGADOR" && item.entregadorId)
      .map(([uid, item]) => mapear(uid, item))
      .sort((a, b) => a.email.localeCompare(b.email, "pt-BR"));
  }

  private async localizar(entregadorId: string): Promise<{
    uid: string;
    registro: RegistroUsuario;
  } | null> {
    const consulta = query(
      ref(this.database, "usuarios"),
      orderByChild("entregadorId"),
      equalTo(entregadorId),
    );
    const snapshot = await get(consulta);
    if (!snapshot.exists()) return null;

    const usuarios = snapshot.val() as Record<string, RegistroUsuario>;
    const encontrados = Object.entries(usuarios);
    if (encontrados.length > 1) {
      throw new Error("Mais de uma conta esta vinculada ao mesmo entregador. Acione o suporte.");
    }
    const primeiro = encontrados[0];
    if (!primeiro) return null;
    return { uid: primeiro[0], registro: primeiro[1] };
  }

  async obterPorEntregadorId(entregadorId: string): Promise<ContaAcessoEntregador | null> {
    const localizado = await this.localizar(entregadorId);
    return localizado ? mapear(localizado.uid, localizado.registro) : null;
  }

  async salvar(dados: DadosSalvarContaAcesso): Promise<ContaAcessoEntregador> {
    const email = dados.email.trim().toLowerCase();
    const existente = await this.localizar(dados.entregadorId);
    const agora = new Date().toISOString();

    if (existente) {
      if (existente.registro.email.toLowerCase() !== email) {
        throw new Error(
          "Na fase Firebase atual, a troca do email de uma conta existente exige o fluxo administrativo seguro que sera adicionado na proxima etapa.",
        );
      }
      if (dados.senhaNova) {
        throw new Error(
          "A senha de uma conta Firebase existente nao pode ser definida pelo navegador do Admin. Use recuperacao de senha; o fluxo administrativo sera refinado na proxima etapa.",
        );
      }

      await update(ref(this.database, `usuarios/${existente.uid}`), {
        nome: dados.nome.trim(),
        ativo: dados.ativo,
        atualizadoEm: agora,
      });

      return {
        ...mapear(existente.uid, existente.registro),
        ativo: dados.ativo,
        atualizadoEm: agora,
      };
    }

    if (!dados.senhaNova || dados.senhaNova.length < 6) {
      throw new Error("Informe uma senha inicial com pelo menos 6 caracteres.");
    }

    const nomeAppSecundario = `delivery-hub-provision-${crypto.randomUUID()}`;
    const appSecundario = initializeApp(this.firebaseOptions, nomeAppSecundario);
    const authSecundario = getAuth(appSecundario);

    try {
      const credencial = await createUserWithEmailAndPassword(
        authSecundario,
        email,
        dados.senhaNova,
      );

      const registro: RegistroUsuario = {
        email,
        nome: dados.nome.trim(),
        tipo: "ENTREGADOR",
        ativo: dados.ativo,
        entregadorId: dados.entregadorId,
        criadoEm: agora,
        atualizadoEm: agora,
      };

      try {
        await set(ref(this.database, `usuarios/${credencial.user.uid}`), registro);
      } catch (erro) {
        // Evita deixar uma conta Auth orfa se o perfil operacional falhar.
        await deleteUser(credencial.user).catch(() => undefined);
        throw erro;
      }

      await signOut(authSecundario);
      return mapear(credencial.user.uid, registro);
    } finally {
      await deleteApp(appSecundario);
    }
  }

  async excluirPorEntregadorId(entregadorId: string): Promise<void> {
    const existente = await this.localizar(entregadorId);
    if (!existente) return;

    // Remove o acesso ao Delivery Hub imediatamente.
    // A conta Auth órfã será removida via backend administrativo em uma etapa futura.
    await remove(ref(this.database, `usuarios/${existente.uid}`));
  }
}
