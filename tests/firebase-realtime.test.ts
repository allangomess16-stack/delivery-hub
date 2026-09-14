import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "firebase/database";
import { ConectividadeFirebase } from "../src/infraestrutura/firebase/conectividade-firebase";
import { ObservadorDadosRemotosFirebase } from "../src/infraestrutura/firebase/observador-dados-remotos-firebase";

const firebaseMock = vi.hoisted(() => ({
  listeners: [] as Array<{
    caminho: string;
    sucesso: (snapshot: { val(): unknown }) => void;
    erro?: () => void;
    parar: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("firebase/database", () => ({
  ref: (_database: unknown, caminho: string) => ({ caminho }),
  onValue: (
    referencia: { caminho: string },
    sucesso: (snapshot: { val(): unknown }) => void,
    erro?: () => void,
  ) => {
    const parar = vi.fn();
    firebaseMock.listeners.push({ caminho: referencia.caminho, sucesso, erro, parar });
    sucesso({ val: () => false });
    return parar;
  },
}));

describe("Realtime Firebase V0.4.7", () => {
  beforeEach(() => {
    firebaseMock.listeners.length = 0;
  });

  it("acompanha a rede local sem abrir assinatura no Realtime Database", () => {
    const descritorAnterior = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const janela = new EventTarget();
    vi.stubGlobal("window", janela);
    const conectividade = new ConectividadeFirebase();
    const encerrar = conectividade.iniciar();

    expect(conectividade.estaOnline()).toBe(false);
    expect(firebaseMock.listeners).toHaveLength(0);

    window.dispatchEvent(new Event("online"));
    expect(conectividade.estaOnline()).toBe(true);

    window.dispatchEvent(new Event("offline"));
    expect(conectividade.estaOnline()).toBe(false);

    encerrar();
    if (descritorAnterior) {
      Object.defineProperty(navigator, "onLine", descritorAnterior);
    } else {
      Reflect.deleteProperty(navigator, "onLine");
    }
    vi.unstubAllGlobals();
  });

  it("observa apenas o entregador e nao confunde a leitura inicial com mudanca", () => {
    const observador = new ObservadorDadosRemotosFirebase({} as Database);
    const eventos: string[] = [];
    const parar = observador.assinar(["entregador-1"], (evento) => eventos.push(evento.tipo));

    expect(firebaseMock.listeners.map((item) => item.caminho)).toEqual([
      "cargas/entregador-1",
      "operacoes/entregador-1",
    ]);
    expect(eventos).toEqual([]);

    firebaseMock.listeners[0].sucesso({ val: () => ({ carga: true }) });
    firebaseMock.listeners[1].sucesso({ val: () => ({ operacao: true }) });
    expect(eventos).toEqual(["CARGAS", "OPERACOES"]);

    parar();
    expect(firebaseMock.listeners.every((item) => item.parar.mock.calls.length === 1)).toBe(true);
  });
});
