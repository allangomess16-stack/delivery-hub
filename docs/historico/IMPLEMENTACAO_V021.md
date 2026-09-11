# Implementação V0.2.1

## Entregue nesta versão

- domínio de identidade desacoplado do Firebase;
- `UsuarioAtual`, `PerfilEntregador` e `VinculoColunaExcel`;
- portas `ServicoAutenticacao`, `RepositorioCargaEntregador`, `RepositorioPerfisEntregador`, `RepositorioVinculosExcel`, `LeitorPlanilha` e `RepositorioFotos`;
- composição real por injeção de dependência;
- autenticação local somente para desenvolvimento;
- Profile Matcher com encontrados, desconhecidos, conflitos e inativos;
- normalização de nomes com trim, espaços, caixa e acentos;
- bloqueio de aliases duplicados;
- criação e vinculação de perfis a partir da planilha;
- resolução explícita de conflitos de alias;
- particionamento da carga por `entregadorId`;
- IndexedDB para perfis e cargas operacionais;
- leitura de carga com prefixo isolado por `entregadorId`;
- login/roteamento ADMIN e ENTREGADOR;
- tela do entregador sem seleção de outros perfis;
- manutenção do fluxo V0.2 de scanner manual, fotos, recebedor, pausa, cancelamento, não entregue e desfazer;
- testes unitários para conciliação, roteamento, particionamento e isolamento.

## Validações realizadas no ambiente de construção

- compilação TypeScript estrita de todos os arquivos `src/` sem erros internos;
- compilação TypeScript estrita de `src/` + testes com stubs apenas para módulos externos não instalados no ambiente;
- smoke test executável validando:
  - aliases equivalentes;
  - duas colunas para o mesmo perfil sem duplicar a carga;
  - isolamento de carga entre `ENT-PEDRO` e outro entregador.

Resultado do smoke test: `SMOKE_OK`.

## Não faz parte da V0.2.1

- Firebase Authentication real;
- sincronização entre aparelhos;
- SQLite Android;
- Capacitor Filesystem para POD;
- scanner/câmera nativos;
- NativeBridge e IntegrationRegistry.

Esses itens permanecem previstos nas próximas versões, sem exigir alteração do domínio de identidade criado aqui.
