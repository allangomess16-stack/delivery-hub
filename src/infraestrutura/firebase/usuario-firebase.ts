import type { Auth } from "firebase/auth";
import type { Database } from "firebase/database";
import { get, ref } from "firebase/database";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";

interface RegistroUsuarioFirebase {
  email: string;
  nome: string;
  tipo: "ADMIN" | "ENTREGADOR";
  ativo: boolean;
  entregadorId?: string;
}

function chaveCache(uid: string): string {
  return `delivery-hub:firebase:usuario:${uid}`;
}

export async function obterUsuarioFirebase(
  auth: Auth,
  database: Database,
): Promise<UsuarioAtual | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  let registro: RegistroUsuarioFirebase | null = null;

  try {
    const snapshot = await get(ref(database, `usuarios/${firebaseUser.uid}`));
    if (snapshot.exists()) {
      registro = snapshot.val() as RegistroUsuarioFirebase;
      localStorage.setItem(chaveCache(firebaseUser.uid), JSON.stringify(registro));
    }
  } catch {
    const cache = localStorage.getItem(chaveCache(firebaseUser.uid));
    if (cache) {
      try {
        registro = JSON.parse(cache) as RegistroUsuarioFirebase;
      } catch {
        registro = null;
      }
    }
  }

  if (!registro || !registro.ativo) return null;

  if (registro.tipo === "ENTREGADOR" && !registro.entregadorId) return null;

  return {
    usuarioId: firebaseUser.uid,
    email: firebaseUser.email ?? registro.email,
    nome: registro.nome,
    tipo: registro.tipo,
    entregadorId: registro.entregadorId,
  };
}
