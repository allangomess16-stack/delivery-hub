import "./interface/estilos/app.css";
import { criarDependenciasLocais } from "./configuracao/composicao-local";
import { criarDependenciasFirebase } from "./configuracao/composicao-firebase";
import { carregarFirebaseRuntimeConfig } from "./configuracao/firebase-runtime";
import { carregarHomologacaoRuntimeConfig } from "./configuracao/homologacao-runtime";
import { criarIntegracaoIMile } from "./configuracao/composicao-integracoes-android";
import { AplicacaoDeliveryHub } from "./interface/app";
import { AplicacaoHomologacao } from "./interface/homologacao/app-homologacao";
import { atualizarIndicadorConectividade } from "./interface/componentes/cabecalho";
import { verificarAtualizacaoDisponivel } from "./interface/atualizacao/verificar-atualizacao";

window.addEventListener("online", () => {
  atualizarIndicadorConectividade();
  void verificarAtualizacaoDisponivel();
});
window.addEventListener("offline", atualizarIndicadorConectividade);

async function iniciar(): Promise<void> {
  const raiz = document.querySelector<HTMLElement>("#app");
  if (!raiz) throw new Error("Elemento #app nao encontrado.");

  try {
    const homologacao = await carregarHomologacaoRuntimeConfig();

    if (homologacao.habilitado) {
      // A borda Android e composta aqui; o dominio permanece independente do Capacitor e do servidor.
      const aplicacao = new AplicacaoHomologacao(raiz, criarIntegracaoIMile());
      await aplicacao.iniciar();
      return;
    }

    const firebaseConfig = await carregarFirebaseRuntimeConfig();
    const modoLocalAutorizado = import.meta.env.DEV || import.meta.env.MODE === "localserver";
    if (!firebaseConfig && !modoLocalAutorizado) {
      throw new Error("Configuracao Firebase obrigatoria neste build operacional.");
    }
    const dependencias = firebaseConfig
      ? criarDependenciasFirebase(firebaseConfig)
      : criarDependenciasLocais();

    const aplicacao = new AplicacaoDeliveryHub(raiz, dependencias);
    await aplicacao.iniciar();
    window.addEventListener("deliveryhubback", () => aplicacao.voltarNativo());
    void verificarAtualizacaoDisponivel();
  } catch (erro) {
    console.error(erro);
    raiz.innerHTML = `
      <main style="max-width:640px;margin:48px auto;padding:24px;font-family:Arial,sans-serif">
        <h1>Delivery Hub</h1>
        <p>Nao foi possivel iniciar o aplicativo.</p>
        <p>Execute BAT/03_VALIDAR_PROJETO.bat e tente novamente.</p>
      </main>
    `;
  }
}

void iniciar();
