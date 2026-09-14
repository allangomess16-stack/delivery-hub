import { abrirAtualizacaoNativa } from "../../infraestrutura/android/ponte-nativa-capacitor";
import { VERSAO_DELIVERY_HUB } from "../../configuracao/versao";

interface ConfigAtualizacao { manifestUrl: string; }
interface ManifestoAtualizacao { version: string; apkUrl: string; mandatory?: boolean; notes?: string; }

function compararVersoes(atual: string, disponivel: string): number {
  const partes = (valor: string) => valor.split(".").map((parte) => Number.parseInt(parte, 10) || 0);
  const a = partes(atual);
  const b = partes(disponivel);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

function manifestoValido(valor: Partial<ManifestoAtualizacao>): valor is ManifestoAtualizacao {
  return typeof valor.version === "string"
    && /^\d+(\.\d+){2,3}$/.test(valor.version)
    && typeof valor.apkUrl === "string"
    && /^https:\/\/(deliveryhubsistem\.(web\.app|firebaseapp\.com)|github\.com)\/.*\.apk$/i.test(valor.apkUrl);
}

function mostrarAviso(manifesto: ManifestoAtualizacao): void {
  if (document.querySelector(".atualizacao-disponivel")) return;
  const camada = document.createElement("aside");
  camada.className = "atualizacao-disponivel";
  camada.setAttribute("role", "dialog");
  camada.setAttribute("aria-label", "Atualização disponível");
  camada.innerHTML = `
    <div><span class="sobrelinha">NOVA VERSÃO</span><strong>Delivery Hub v${manifesto.version}</strong>
    <p>${manifesto.notes || "Há uma atualização pronta para instalar."}</p></div>
    <button class="botao-acao botao-acao--primario" data-atualizar-agora>ATUALIZAR AGORA</button>
    ${manifesto.mandatory ? "" : '<button class="acao-texto" data-atualizar-depois>DEPOIS</button>'}
  `;
  document.body.append(camada);
  camada.querySelector<HTMLButtonElement>("[data-atualizar-agora]")?.addEventListener("click", async () => {
    const aberto = await abrirAtualizacaoNativa(manifesto.apkUrl);
    if (!aberto) window.open(manifesto.apkUrl, "_blank", "noopener,noreferrer");
  });
  camada.querySelector<HTMLButtonElement>("[data-atualizar-depois]")?.addEventListener("click", () => camada.remove());
}

async function buscarManifesto(url: string): Promise<Partial<ManifestoAtualizacao> | null> {
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) return null;
  return resposta.json() as Promise<Partial<ManifestoAtualizacao>>;
}

/**
 * O arquivo de configuracao permite trocar o destino sem novo APK, mas o
 * manifesto local publicado no Hosting continua como rota de reserva. Isso
 * evita que uma configuracao ausente ou uma resposta de WebView imprecisa
 * sobre conectividade esconda uma atualizacao valida.
 */
async function carregarManifestoAtualizacao(): Promise<Partial<ManifestoAtualizacao> | null> {
  try {
    const configuracao = await fetch("/app-update-config.json", { cache: "no-store" });
    if (configuracao.ok) {
      const config = await configuracao.json() as Partial<ConfigAtualizacao>;
      if (config.manifestUrl?.startsWith("https://deliveryhubsistem.")) {
        const manifestoRemoto = await buscarManifesto(config.manifestUrl);
        if (manifestoRemoto) return manifestoRemoto;
      }
    }
  } catch {
    // Tenta a rota de reserva abaixo.
  }

  try {
    return await buscarManifesto("/app-update.json");
  } catch {
    return null;
  }
}

/** Falhas de rede ou de publicação nunca bloqueiam o trabalho de campo. */
export async function verificarAtualizacaoDisponivel(): Promise<void> {
  try {
    const manifesto = await carregarManifestoAtualizacao();
    if (manifesto && manifestoValido(manifesto) && compararVersoes(VERSAO_DELIVERY_HUB, manifesto.version) < 0) {
      mostrarAviso(manifesto);
    }
  } catch {
    // Rede hostil, captive portal ou Hosting indisponível: segue em offline-first.
  }
}
