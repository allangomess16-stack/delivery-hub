import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname, "../..");
const pastaDist = path.join(raiz, "dist");
const pastaDados = process.env.DELIVERY_HUB_DATA_DIR
  ? path.resolve(process.env.DELIVERY_HUB_DATA_DIR)
  : process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "DeliveryHubDev")
    : path.join(raiz, ".delivery-hub-data");
const arquivoDados = path.join(pastaDados, "storage.json");
const porta = Number(process.env.PORT || 5173);
const limiteBody = 25 * 1024 * 1024;

async function garantirDados() {
  await fs.mkdir(pastaDados, { recursive: true });
  try {
    await fs.access(arquivoDados);
  } catch {
    await fs.writeFile(arquivoDados, "{}", "utf8");
  }
}

async function lerDados() {
  await garantirDados();
  try {
    const texto = await fs.readFile(arquivoDados, "utf8");
    const parsed = JSON.parse(texto || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function salvarDados(dados) {
  await garantirDados();
  const temporario = `${arquivoDados}.tmp`;
  await fs.writeFile(temporario, JSON.stringify(dados, null, 2), "utf8");
  await fs.rename(temporario, arquivoDados);
}

function enviarJson(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(corpo);
}

async function lerBody(req) {
  return await new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on("data", (parte) => {
      tamanho += parte.length;
      if (tamanho > limiteBody) {
        reject(new Error("Corpo da requisicao excede 25 MB."));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on("end", () => {
      try {
        const texto = Buffer.concat(partes).toString("utf8");
        resolve(texto ? JSON.parse(texto) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}


const adminDev = {
  email: String(process.env.DELIVERY_HUB_ADMIN_EMAIL || "admin@deliveryhub.local").trim().toLowerCase(),
  senha: String(process.env.DELIVERY_HUB_ADMIN_PASSWORD || "admin123"),
};
const prefixoContas = "auth/couriers/";

function normalizarEmail(valor) {
  return String(valor || "").trim().toLowerCase();
}

function contaPublica(registro) {
  if (!registro) return null;
  const { senhaHash: _hash, senhaSalt: _salt, ...conta } = registro;
  return conta;
}

function gerarHashSenha(senha, saltHex) {
  return scryptSync(String(senha), Buffer.from(saltHex, "hex"), 64).toString("hex");
}

function senhaConfere(senha, registro) {
  try {
    const esperado = Buffer.from(registro.senhaHash, "hex");
    const calculado = Buffer.from(gerarHashSenha(senha, registro.senhaSalt), "hex");
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

function registrosContas(dados) {
  return Object.entries(dados)
    .filter(([chave]) => chave.startsWith(prefixoContas))
    .map(([, valor]) => valor)
    .filter(Boolean);
}

async function tratarContas(req, res, url, dados) {
  if (url.pathname !== "/api/accounts") return false;

  if (req.method === "GET") {
    const entregadorId = url.searchParams.get("courierId");
    if (entregadorId) {
      const registro = dados[`${prefixoContas}${entregadorId}`];
      if (!registro) {
        enviarJson(res, 404, { ok: false, erro: "Conta de acesso nao encontrada." });
        return true;
      }
      enviarJson(res, 200, { ok: true, conta: contaPublica(registro) });
      return true;
    }

    const contas = registrosContas(dados)
      .map(contaPublica)
      .sort((a, b) => a.email.localeCompare(b.email, "pt-BR"));
    enviarJson(res, 200, { ok: true, contas });
    return true;
  }

  if (req.method === "PUT") {
    const body = await lerBody(req);
    const entregadorId = String(body.entregadorId || "").trim();
    const email = normalizarEmail(body.email);
    const nome = String(body.nome || "").trim();
    const ativo = Boolean(body.ativo);
    const senhaNova = body.senhaNova ? String(body.senhaNova) : "";

    if (!entregadorId || !email || !nome) {
      enviarJson(res, 400, { ok: false, erro: "Entregador, email e nome sao obrigatorios." });
      return true;
    }
    if (!email.includes("@")) {
      enviarJson(res, 400, { ok: false, erro: "Email de acesso invalido." });
      return true;
    }
    if (email === adminDev.email) {
      enviarJson(res, 409, { ok: false, erro: "Este email esta reservado para o administrador local." });
      return true;
    }

    const chave = `${prefixoContas}${entregadorId}`;
    const existente = dados[chave];
    const outroComEmail = registrosContas(dados).find(
      (item) => item.entregadorId !== entregadorId && normalizarEmail(item.email) === email,
    );
    if (outroComEmail) {
      enviarJson(res, 409, { ok: false, erro: "Este email ja esta vinculado a outro entregador." });
      return true;
    }

    if (!existente && senhaNova.length < 6) {
      enviarJson(res, 400, { ok: false, erro: "A senha inicial deve ter pelo menos 6 caracteres." });
      return true;
    }
    if (senhaNova && senhaNova.length < 6) {
      enviarJson(res, 400, { ok: false, erro: "A nova senha deve ter pelo menos 6 caracteres." });
      return true;
    }

    const agora = new Date().toISOString();
    const registro = existente
      ? { ...existente }
      : {
          usuarioId: `DEV-USER-${randomUUID()}`,
          entregadorId,
          criadoEm: agora,
          senhaSalt: randomBytes(16).toString("hex"),
          senhaHash: "",
        };

    registro.email = email;
    registro.nome = nome;
    registro.ativo = ativo;
    registro.atualizadoEm = agora;

    if (senhaNova) {
      registro.senhaSalt = randomBytes(16).toString("hex");
      registro.senhaHash = gerarHashSenha(senhaNova, registro.senhaSalt);
    }

    dados[chave] = registro;
    await salvarDados(dados);
    enviarJson(res, 200, { ok: true, conta: contaPublica(registro) });
    return true;
  }

  if (req.method === "DELETE") {
    const entregadorId = url.searchParams.get("courierId");
    if (!entregadorId) {
      enviarJson(res, 400, { ok: false, erro: "courierId obrigatorio." });
      return true;
    }
    const chave = `${prefixoContas}${entregadorId}`;
    if (!dados[chave]) {
      enviarJson(res, 404, { ok: false, erro: "Conta de acesso nao encontrada." });
      return true;
    }
    delete dados[chave];
    await salvarDados(dados);
    enviarJson(res, 200, { ok: true });
    return true;
  }

  enviarJson(res, 405, { ok: false, erro: "Metodo nao permitido." });
  return true;
}

async function tratarLogin(req, res, url, dados) {
  if (url.pathname !== "/api/auth/login") return false;
  if (req.method !== "POST") {
    enviarJson(res, 405, { ok: false, erro: "Metodo nao permitido." });
    return true;
  }

  const body = await lerBody(req);
  const email = normalizarEmail(body.email);
  const senha = String(body.senha || "");

  if (email === adminDev.email && senha === adminDev.senha) {
    enviarJson(res, 200, {
      ok: true,
      usuario: {
        usuarioId: "DEV-ADMIN-001",
        email: adminDev.email,
        nome: "Administrador Local",
        tipo: "ADMIN",
      },
    });
    return true;
  }

  const conta = registrosContas(dados).find((item) => normalizarEmail(item.email) === email);
  if (!conta || !conta.ativo || !senhaConfere(senha, conta)) {
    enviarJson(res, 401, { ok: false, erro: "Email ou senha invalidos, ou perfil desativado." });
    return true;
  }

  enviarJson(res, 200, {
    ok: true,
    usuario: {
      usuarioId: conta.usuarioId,
      email: conta.email,
      nome: conta.nome,
      tipo: "ENTREGADOR",
      entregadorId: conta.entregadorId,
    },
  });
  return true;
}

async function tratarApi(req, res, url) {
  if (url.pathname === "/api/health") {
    enviarJson(res, 200, { ok: true, modo: "servidor-local-compartilhado" });
    return true;
  }

  const dados = await lerDados();

  if (await tratarLogin(req, res, url, dados)) return true;
  if (await tratarContas(req, res, url, dados)) return true;

  if (url.pathname !== "/api/storage") return false;

  if (req.method === "GET") {
    const chave = url.searchParams.get("key");
    const prefixo = url.searchParams.get("prefix");

    if (chave !== null) {
      enviarJson(res, 200, {
        ok: true,
        encontrado: Object.prototype.hasOwnProperty.call(dados, chave),
        valor: Object.prototype.hasOwnProperty.call(dados, chave) ? dados[chave] : null,
      });
      return true;
    }

    if (prefixo !== null) {
      const itens = Object.entries(dados)
        .filter(([itemChave]) => itemChave.startsWith(prefixo))
        .map(([itemChave, valor]) => ({ chave: itemChave, valor }));
      enviarJson(res, 200, { ok: true, itens });
      return true;
    }

    enviarJson(res, 400, { ok: false, erro: "Informe key ou prefix." });
    return true;
  }

  if (req.method === "PUT") {
    const body = await lerBody(req);
    if (!body?.chave || typeof body.chave !== "string") {
      enviarJson(res, 400, { ok: false, erro: "Chave obrigatoria." });
      return true;
    }
    dados[body.chave] = body.valor;
    await salvarDados(dados);
    enviarJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "DELETE") {
    const chave = url.searchParams.get("key");
    if (!chave) {
      enviarJson(res, 400, { ok: false, erro: "Chave obrigatoria." });
      return true;
    }
    delete dados[chave];
    await salvarDados(dados);
    enviarJson(res, 200, { ok: true });
    return true;
  }

  enviarJson(res, 405, { ok: false, erro: "Metodo nao permitido." });
  return true;
}

const tipos = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
]);

async function servirArquivo(req, res, url) {
  let caminho = decodeURIComponent(url.pathname);
  if (caminho === "/") caminho = "/index.html";
  const absoluto = path.resolve(pastaDist, `.${caminho}`);

  if (!absoluto.startsWith(path.resolve(pastaDist))) {
    res.writeHead(403); res.end("Acesso negado"); return;
  }

  try {
    const stat = await fs.stat(absoluto);
    if (!stat.isFile()) throw new Error("Nao e arquivo");
    const conteudo = await fs.readFile(absoluto);
    res.writeHead(200, {
      "Content-Type": tipos.get(path.extname(absoluto).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(conteudo);
  } catch {
    try {
      const index = await fs.readFile(path.join(pastaDist, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(index);
    } catch {
      res.writeHead(404); res.end("Build local nao encontrado. Execute npm run build:local.");
    }
  }
}

function ehIpv4Privado(ip) {
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  const match172 = ip.match(/^172\.(\d+)\./);
  return Boolean(match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31);
}

function pontuarInterface(nome, ip) {
  const n = nome.toLowerCase();
  let pontos = 0;

  if (/^192\.168\./.test(ip)) pontos += 120;
  else if (/^10\./.test(ip)) pontos += 110;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) pontos += 100;
  else pontos += 20;

  if (/(wi-?fi|wlan|wireless|ethernet|rede local)/i.test(nome)) pontos += 35;
  if (/(vethernet|wsl|virtualbox|vmware|hyper-v|hamachi|tailscale|zerotier|vpn|bluetooth|docker)/i.test(nome)) pontos -= 180;

  return pontos;
}

function ipsLocais() {
  const encontrados = [];
  let interfacesPorNome;

  try {
    interfacesPorNome = os.networkInterfaces();
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : "erro desconhecido";
    console.warn(`[AVISO] Nao foi possivel listar a rede local: ${detalhe}`);
    console.warn("[AVISO] O acesso pelo PC continua disponivel em localhost.");
    return encontrados;
  }

  for (const [nome, interfaces] of Object.entries(interfacesPorNome)) {
    for (const item of interfaces || []) {
      if (item.family !== "IPv4" || item.internal) continue;
      encontrados.push({
        nome,
        ip: item.address,
        privado: ehIpv4Privado(item.address),
        pontos: pontuarInterface(nome, item.address),
      });
    }
  }

  const preferidoEnv = String(process.env.DELIVERY_HUB_DISPLAY_IP || "").trim();
  encontrados.sort((a, b) => {
    if (preferidoEnv && a.ip === preferidoEnv) return -1;
    if (preferidoEnv && b.ip === preferidoEnv) return 1;
    return b.pontos - a.pontos;
  });

  return encontrados;
}

await garantirDados();
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (await tratarApi(req, res, url)) return;
    await servirArquivo(req, res, url);
  } catch (erro) {
    console.error(erro);
    enviarJson(res, 500, { ok: false, erro: "Erro interno do servidor local." });
  }
});

servidor.listen(porta, "0.0.0.0", () => {
  const ips = ipsLocais();
  const preferido = ips.find((item) => item.privado) ?? ips[0];

  console.log("============================================================");
  console.log(" DELIVERY HUB - SERVIDOR LOCAL COMPARTILHADO");
  console.log("============================================================");
  console.log(` PC:      http://localhost:${porta}`);

  if (preferido) {
    console.log("");
    console.log(" ACESSO RECOMENDADO NO CELULAR:");
    console.log(` ${`http://${preferido.ip}:${porta}`}`);
    console.log(` Interface: ${preferido.nome}`);
  }

  if (ips.length > 1) {
    console.log("");
    console.log(" OUTROS ENDERECOS DETECTADOS:");
    for (const item of ips) {
      if (preferido && item.ip === preferido.ip) continue;
      console.log(` - http://${item.ip}:${porta}  [${item.nome}]`);
    }
  }

  console.log("");
  console.log(" Perfis, contas e cargas sao compartilhados entre navegadores");
  console.log(" que acessarem ESTE servidor.");
  console.log("");
  console.log(" Se o celular nao abrir:");
  console.log(" 1) confirme que PC e celular estao na mesma rede;");
  console.log(" 2) execute BAT\\04_CORRIGIR_ACESSO_CELULAR.bat.");
  console.log("");
  console.log(` Dados: ${arquivoDados}`);
  console.log(" Para encerrar: CTRL+C");
  console.log("============================================================");
});
