export interface RegiaoOperacionalConfig {
  id: string;
  nome: string;
  ra: string;
  aliases: string[];
}

/**
 * Regioes Administrativas do Distrito Federal.
 * A lista e configuracao operacional: aliases podem ser ampliados sem alterar
 * a regra de negocio. Evitamos usar apenas "BRASILIA" como alias do Plano
 * Piloto porque muitos enderecos do DF terminam genericamente em Brasilia/DF.
 */
export const REGIOES_DF: RegiaoOperacionalConfig[] = [
  { id: "RA-01", nome: "Plano Piloto", ra: "RA I", aliases: ["PLANO PILOTO", "ASA NORTE", "ASA SUL"] },
  { id: "RA-02", nome: "Gama", ra: "RA II", aliases: ["GAMA"] },
  { id: "RA-03", nome: "Taguatinga", ra: "RA III", aliases: ["TAGUATINGA"] },
  { id: "RA-04", nome: "Brazlândia", ra: "RA IV", aliases: ["BRAZLANDIA", "BRAZLÂNDIA"] },
  { id: "RA-05", nome: "Sobradinho", ra: "RA V", aliases: ["SOBRADINHO"] },
  { id: "RA-06", nome: "Planaltina", ra: "RA VI", aliases: ["PLANALTINA"] },
  { id: "RA-07", nome: "Paranoá", ra: "RA VII", aliases: ["PARANOA", "PARANOÁ"] },
  { id: "RA-08", nome: "Núcleo Bandeirante", ra: "RA VIII", aliases: ["NUCLEO BANDEIRANTE", "NÚCLEO BANDEIRANTE"] },
  { id: "RA-09", nome: "Ceilândia", ra: "RA IX", aliases: ["CEILANDIA", "CEILÂNDIA"] },
  { id: "RA-10", nome: "Guará", ra: "RA X", aliases: ["GUARA", "GUARÁ"] },
  { id: "RA-11", nome: "Cruzeiro", ra: "RA XI", aliases: ["CRUZEIRO"] },
  { id: "RA-12", nome: "Samambaia", ra: "RA XII", aliases: ["SAMAMBAIA"] },
  { id: "RA-13", nome: "Santa Maria", ra: "RA XIII", aliases: ["SANTA MARIA"] },
  { id: "RA-14", nome: "São Sebastião", ra: "RA XIV", aliases: ["SAO SEBASTIAO", "SÃO SEBASTIÃO"] },
  { id: "RA-15", nome: "Recanto das Emas", ra: "RA XV", aliases: ["RECANTO DAS EMAS"] },
  { id: "RA-16", nome: "Lago Sul", ra: "RA XVI", aliases: ["LAGO SUL"] },
  { id: "RA-17", nome: "Riacho Fundo", ra: "RA XVII", aliases: ["RIACHO FUNDO"] },
  { id: "RA-18", nome: "Lago Norte", ra: "RA XVIII", aliases: ["LAGO NORTE"] },
  { id: "RA-19", nome: "Candangolândia", ra: "RA XIX", aliases: ["CANDANGOLANDIA", "CANDANGOLÂNDIA"] },
  { id: "RA-20", nome: "Águas Claras", ra: "RA XX", aliases: ["AGUAS CLARAS", "ÁGUAS CLARAS"] },
  { id: "RA-21", nome: "Riacho Fundo II", ra: "RA XXI", aliases: ["RIACHO FUNDO II", "RIACHO FUNDO 2"] },
  { id: "RA-22", nome: "Sudoeste / Octogonal", ra: "RA XXII", aliases: ["SUDOESTE", "OCTOGONAL", "SUDOESTE OCTOGONAL"] },
  { id: "RA-23", nome: "Varjão", ra: "RA XXIII", aliases: ["VARJAO", "VARJÃO"] },
  { id: "RA-24", nome: "Park Way", ra: "RA XXIV", aliases: ["PARK WAY"] },
  { id: "RA-25", nome: "Estrutural (SCIA)", ra: "RA XXV", aliases: ["ESTRUTURAL", "SCIA"] },
  { id: "RA-26", nome: "Sobradinho II", ra: "RA XXVI", aliases: ["SOBRADINHO II", "SOBRADINHO 2"] },
  { id: "RA-27", nome: "Jardim Botânico", ra: "RA XXVII", aliases: ["JARDIM BOTANICO", "JARDIM BOTÂNICO"] },
  { id: "RA-28", nome: "Itapoã", ra: "RA XXVIII", aliases: ["ITAPOA", "ITAPOÃ"] },
  { id: "RA-29", nome: "SIA", ra: "RA XXIX", aliases: ["SIA", "SETOR DE INDUSTRIA E ABASTECIMENTO", "SETOR DE INDÚSTRIA E ABASTECIMENTO"] },
  { id: "RA-30", nome: "Vicente Pires", ra: "RA XXX", aliases: ["VICENTE PIRES"] },
  { id: "RA-31", nome: "Fercal", ra: "RA XXXI", aliases: ["FERCAL"] },
  { id: "RA-32", nome: "Sol Nascente e Pôr do Sol", ra: "RA XXXII", aliases: ["SOL NASCENTE", "POR DO SOL", "PÔR DO SOL", "SOL NASCENTE E POR DO SOL", "SOL NASCENTE E PÔR DO SOL"] },
  { id: "RA-33", nome: "Arniqueira", ra: "RA XXXIII", aliases: ["ARNIQUEIRA"] },
  { id: "RA-34", nome: "Arapoanga", ra: "RA XXXIV", aliases: ["ARAPOANGA"] },
  { id: "RA-35", nome: "Água Quente", ra: "RA XXXV", aliases: ["AGUA QUENTE", "ÁGUA QUENTE"] },
];
