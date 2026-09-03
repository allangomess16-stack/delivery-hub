# Fase atual — V0.1

## Implementado

- scaffold TypeScript + Vite;
- configuracao Capacitor Android;
- design dark-first centralizado;
- botoes com borda colorida de 2px;
- cabecalho fixo;
- rodape de acoes fixo;
- importacao XLSX;
- cada coluna tratada como entregador;
- normalizacao de codigo;
- extracao de `TN` em texto bruto de scanner;
- identificacao inicial J&T / Anjun / iMile;
- classificacao desconhecida sem adivinhacao;
- deteccao de duplicidades;
- resumo por transportadora;
- resumo por entregador;
- persistencia local provisoria;
- testes unitarios;
- BATs para setup, dev, build, Android, Git e ADB.

## Proxima fase

1. scanner de QR / codigo de barras;
2. fluxo de entrega em etapas curtas;
3. pausar / cancelar / desfazer;
4. fotos tipadas: etiqueta, fachada, pacote;
5. armazenamento local de provas;
6. estado fisico separado da baixa externa.

## Regra de arquitetura

A persistencia atual usa `localStorage` apenas para validar a Fase 0/1 no navegador.
A interface `RepositorioCarga` permite trocar isso por SQLite no Android sem alterar dominio e telas.


## V0.1.2 — Revisões clicáveis

- card `Revisar` da tela inicial agora é clicável quando houver pendências;
- ao abrir, a tela mostra somente pacotes marcados para revisão;
- cada item exibe entregador, código, transportadora e motivo;
- quando o valor original é diferente do normalizado, ambos ficam visíveis;
- se não houver revisão, o card permanece desabilitado.


## V0.2.0 — Fluxo operacional de entrega

Implementado conforme `docs/V0.2_FLUXO_ENTREGA.md`.


## V0.2.1 — Identidade e Perfis

Implementado: autenticação local desacoplada, Profile Matcher, aliases, conflitos, perfis inativos, separação das cargas e IndexedDB operacional.


## V0.2.2 — Compartilhamento local + CRUD de perfis

Ver `docs/V0.2.2_COMPARTILHAMENTO_E_PERFIS.md`.

## V0.2.3 — Contas de acesso por perfil

Cada perfil operacional agora possui conta de login propria vinculada por `entregadorId`.

## V0.3.2

Motor de integrações iniciado com evidência estática real dos APKs Anjun e iMile.
J&T permanece sem package confirmado. Automação permanece bloqueada até validação
ADB/aparelho/produção.

