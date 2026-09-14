import type { Auth } from "firebase/auth";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";

interface RegistroUsuarioFirebase {
  email: string;
  nome: string;
  tipo: "ADMIN" | "SUPORTE" | "ENTREGADOR";
  ativo: boolean;
  entregadorId?: string;
}

function chaveCache(uid: string): string {
  return `delivery-hub:firebase:usuario:${uid}`;
}

export async function obterUsuarioFirebase(
  auth: Auth,
  rest: ClienteRealtimeRest,
): Promise<UsuarioAtual | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  let registro: RegistroUsuarioFirebase | null = null;

  try {
    const remoto = await rest.obter<RegistroUsuarioFirebase>(`usuarios/${firebaseUser.uid}`);
    if (remoto) {
      registro = remoto;
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
