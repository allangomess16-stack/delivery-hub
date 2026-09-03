import type { RepositorioPerfisEntregador } from "../../aplicacao/portas/repositorio-perfis-entregador";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { normalizarNomeExcel } from "../../aplicacao/identidade/normalizar-nome-excel";
import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";

const PREFIXO = "profiles/couriers/";

export class RepositorioPerfisLocalAdapter implements RepositorioPerfisEntregador {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async listar(): Promise<PerfilEntregador[]> {
    const itens = await this.armazenamento.listar<PerfilEntregador>(PREFIXO);
    return itens.map((item) => item.valor).sort((a, b) => a.nomeOficial.localeCompare(b.nomeOficial, "pt-BR"));
  }

  async obter(entregadorId: string): Promise<PerfilEntregador | null> {
    return this.armazenamento.obter<PerfilEntregador>(`${PREFIXO}${entregadorId}`);
  }

  async salvar(perfil: PerfilEntregador): Promise<void> {
    const nome = perfil.nomeOficial.trim();
    if (!nome) throw new Error("Nome oficial e obrigatorio.");

    const aliasesLimpos = perfil.excelAliases
      .map((alias) => alias.trim())
      .filter(Boolean)
      .filter((alias, indice, todos) =>
        todos.findIndex((outro) => normalizarNomeExcel(outro) === normalizarNomeExcel(alias)) === indice,
      );

    const perfis = await this.listar();
    const aliasDoPerfil = new Set(aliasesLimpos.map(normalizarNomeExcel));
    for (const existente of perfis) {
      if (existente.entregadorId === perfil.entregadorId) continue;
      const colisao = existente.excelAliases.some((alias) => aliasDoPerfil.has(normalizarNomeExcel(alias)));
      if (colisao) throw new Error(`Um dos aliases ja e utilizado por ${existente.nomeOficial}.`);
    }

    await this.armazenamento.salvar(`${PREFIXO}${perfil.entregadorId}`, {
      ...perfil,
      nomeOficial: nome,
      excelAliases: aliasesLimpos,
      atualizadoEm: new Date().toISOString(),
    });
  }

  async excluir(entregadorId: string): Promise<void> {
    await this.armazenamento.remover(`${PREFIXO}${entregadorId}`);
  }

  async adicionarAlias(entregadorId: string, alias: string): Promise<PerfilEntregador> {
    const perfil = await this.obter(entregadorId);
    if (!perfil) throw new Error("Perfil de entregador nao encontrado.");
    const aliasNormalizado = normalizarNomeExcel(alias);
    const perfis = await this.listar();
    const dono = perfis.find((item) => item.entregadorId !== entregadorId && item.excelAliases.some((existente) => normalizarNomeExcel(existente) === aliasNormalizado));
    if (dono) throw new Error(`Este nome ja esta vinculado a ${dono.nomeOficial}.`);
    if (!perfil.excelAliases.some((existente) => normalizarNomeExcel(existente) === aliasNormalizado)) {
      perfil.excelAliases.push(alias.trim());
      await this.salvar(perfil);
    }
    return (await this.obter(entregadorId))!;
  }

  async removerAlias(entregadorId: string, alias: string): Promise<PerfilEntregador> {
    const perfil = await this.obter(entregadorId);
    if (!perfil) throw new Error("Perfil de entregador nao encontrado.");
    const chave = normalizarNomeExcel(alias);
    const novos = perfil.excelAliases.filter((existente) => normalizarNomeExcel(existente) !== chave);
    perfil.excelAliases = novos;
    await this.salvar(perfil);
    return (await this.obter(entregadorId))!;
  }

  async definirAtivo(entregadorId: string, ativo: boolean): Promise<PerfilEntregador> {
    const perfil = await this.obter(entregadorId);
    if (!perfil) throw new Error("Perfil de entregador nao encontrado.");
    perfil.ativo = ativo;
    await this.salvar(perfil);
    return (await this.obter(entregadorId))!;
  }
}
