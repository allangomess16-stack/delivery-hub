import { REGRAS_TRANSPORTADORAS } from "../configuracao/transportadoras";
import type { TransportadoraIdentificada } from "../dominio/transportadora/tipos";

export function identificarTransportadora(codigo: string): TransportadoraIdentificada {
  const regra = REGRAS_TRANSPORTADORAS.find((item) => item.expressao.test(codigo));

  if (!regra) {
    return {
      id: "OUTRA",
      nome: "Outra / nao identificada",
      confianca: "DESCONHECIDA",
    };
  }

  return {
    id: regra.transportadora,
    nome: regra.nome,
    confianca: "ALTA",
    regraUsada: regra.id,
  };
}
