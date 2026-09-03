import "./interface/estilos/app.css";
import { criarDependenciasLocais } from "./configuracao/composicao-local";
import { criarDependenciasFirebase } from "./configuracao/composicao-firebase";
import { carregarFirebaseRuntimeConfig } from "./configuracao/firebase-runtime";
import { carregarHomologacaoRuntimeConfig } from "./configuracao/homologacao-runtime";
import { AplicacaoDeliveryHub } from "./interface/app";
import { AplicacaoHomologacao } from "./interface/homologacao/app-homologacao";

async function iniciar(): Promise<void> {
  const raiz = document.querySelector<HTMLElement>("#app");
  if (!raiz) throw new Error("Elemento #app nao encontrado.");

  try {
    const homologacao = await carregarHomologacaoRuntimeConfig();

    if (homologacao.habilitado) {
      const aplicacao = new AplicacaoHomologacao(raiz);
      aplicacao.iniciar();
      return;
    }

    const firebaseConfig = await carregarFirebaseRuntimeConfig();
    const dependencias = firebaseConfig
      ? criarDependenciasFirebase(firebaseConfig)
      : criarDependenciasLocais();

    const aplicacao = new AplicacaoDeliveryHub(raiz, dependencias);
    await aplicacao.iniciar();
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
