# Delivery Hub — relatório de progresso

**Data de referência:** 09/09/2026  
**Versão em desenvolvimento:** V0.4.8.2  
**Próxima revisão:** V0.5.0  
**Prontidão global estimada:** **78%**

> O percentual representa prontidão para um piloto operacional seguro. Não é
> contagem de telas ou linhas de código. Recursos ainda não homologados no
> aparelho não são tratados como concluídos.

## 1. Resumo executivo

A V0.4.6 comprovou no aparelho a integração externa de Nível 1 com a iMile
2.3.18: `crredelivery:?requestCode=${tracking}` abre a pesquisa correta, recebe
o código e permite retornar ao Delivery Hub. Scanner contínuo e navegação estão
em `DEVICE_VALIDATED`; isso não comprova baixa ou POD automáticos.

A V0.4.7.2 fechou o sincronismo Firebase real. No teste aprovado pelo usuário,
a operação entrou em `AGUARDANDO SYNC`, saiu da Outbox e foi corretamente para
`NO HUB`, sem duplicidade e sem declarar confirmação da transportadora.

A V0.4.8 preserva essa base e adiciona proteção contra atualizações dos apps de
transportadora: contratos por `versionCode`, protocolo compilado permitido,
kill switch, cache fail-closed e fallback por clipboard + launcher. Também cria
o papel `SUPORTE`, separado do `ADMIN`, com painel de compatibilidade.

Os logs de integração são silenciosos e não contêm tracking, recebedor,
documento, foto, POD ou token. Uma fila local própria, limitada a 200 itens,
mantém eventos durante falhas de rede sem interferir na Outbox operacional. O
painel baixa somente os 200 últimos eventos do dia escolhido.

A V0.4.8.2 adiciona o reparo conservador de cargas estruturais duplicadas,
colunas auxiliares ignoráveis, busca global de tracking por texto/foto e
redefinição segura de senha. Essas capacidades estão cobertas por testes
automatizados e aguardam homologação visual no Admin real.

## 2. Capacidades homologadas no aparelho

- [x] APK separado e instalação paralela;
- [x] scanner contínuo e confirmação por repetição;
- [x] identificação iMile, Anjun e J&T pelos padrões cadastrados;
- [x] Outbox persistente após fechar/reabrir;
- [x] mesmo UUID nas tentativas e ausência de duplicidade;
- [x] sincronismo Firebase real `FILA 1 → FILA 0 → NO HUB`;
- [x] NativeBridge com Intent explícita e `setPackage`;
- [x] iMile 2.3.18 / versionCode 458 aberta com tracking;
- [x] retorno da iMile para o Delivery Hub;
- [ ] fallback V0.4.8 homologado no aparelho;
- [ ] painel SUPORTE e kill switch homologados no Firebase real.

### Classificação da iMile

| Item | Estado |
|---|---|
| Pacote | `com.imile.redelivery` |
| Versão comprovada | 2.3.18 / code 458 |
| Contrato | `crredelivery:?requestCode=${tracking}` |
| Capacidade | pesquisa e navegação contextual |
| Evidência | `DEVICE_VALIDATED` |
| POD/baixa automática | não expostos/não comprovados |

## 3. Fundação implementada

### Arquitetura, operação e offline

- [x] domínio, aplicação, infraestrutura e interface separados;
- [x] adaptadores independentes por transportadora;
- [x] estado físico separado do estado sistêmico/transportadora;
- [x] tracking preservado como string;
- [x] carga diária por entregador e gestão por região;
- [x] IndexedDB e Outbox operacional persistente;
- [x] idempotência, backoff, timeout e poison pill isolada;
- [x] token Firebase renovado após 401;
- [x] atualizações multipath com `PATCH`;
- [x] aparelho do entregador usando REST curto, sem WebSocket do banco;
- [x] regras sem leitura ampla de cargas/operações;
- [x] 44 arquivos de teste e 139 testes automatizados aprovados;
- [x] build web de produção aprovado.

### Compatibilidade e suporte V0.4.8

- [x] contrato por transportadora e `versionCode`;
- [x] URI remota arbitrária proibida;
- [x] versão desconhecida em modo seguro;
- [x] kill switch remoto exclusivo do suporte;
- [x] clipboard e launcher no NativeBridge;
- [x] fallback automático se o Deep Link falhar;
- [x] logs sem dados operacionais/pessoais;
- [x] fila de logs separada e limitada;
- [x] leitura do suporte limitada no servidor;
- [x] papéis `ADMIN`, `SUPORTE` e `ENTREGADOR` separados;
- [ ] compilar o Java/Gradle no Windows e homologar no aparelho.

## 4. Progresso por área

| Área | Progresso | Situação |
|---|---:|---|
| Arquitetura e domínio | 93% | Fundação e contratos sólidos |
| Scanner e identificação | 95% | Aprovado; falta rota completa com mais etiquetas |
| Fluxo de entrega/POD | 82% | Registro pronto; POD externo continua manual |
| Offline/Outbox/idempotência | 98% | Fluxo real aprovado |
| Admin e gestão de cargas | 95% | Busca/transferência rápidas prontas; teste visual pendente |
| Firebase/sincronização | 94% | REST resiliente; regras V0.4.8 aguardam publicação |
| NativeBridge Android | 88% | Deep Link aprovado; clipboard/launcher aguardam teste |
| Integração iMile | 76% | Nível 1 protegido; retorno de baixa não existe |
| Integração Anjun | 18% | Isolada; contrato externo pendente |
| Integração J&T | 8% | Link de distribuição conhecido; APK/contrato pendentes |
| Logs e suporte | 70% | Código/painel prontos; homologação real pendente |
| Atualização/compatibilidade | 55% | App externo protegido; aviso do Hub ainda futuro |
| Segurança/release | 58% | Regras fortes; assinatura/CI e auditoria pendentes |
| Testes de campo | 42% | Um aparelho aprovado; dia completo e 10 usuários pendentes |

## 5. Próxima sequência

### Fechar V0.4.8

- [ ] executar `BAT/FIREBASE/03_SUBIR_ATUALIZACAO.bat`;
- [ ] executar `BAT/FIREBASE/10_PREPARAR_PILOTO_V048.bat`;
- [ ] criar e-mail separado pelo BAT 11 para o SUPORTE;
- [ ] confirmar Deep Link ativo na iMile 458;
- [ ] acionar o fallback no painel e confirmar código copiado + app aberto;
- [ ] confirmar que o log aparece sem tracking;
- [ ] reativar o Deep Link;
- [ ] repetir `FILA 1 → FILA 0 → NO HUB` para confirmar ausência de regressão.
- [ ] repetir a planilha que deixou duas cargas ativas e confirmar o reparo;
- [ ] ignorar uma coluna auxiliar inesperada;
- [ ] localizar uma etiqueta por foto no Admin e transferir um pacote pendente;
- [ ] enviar um link de redefinição de senha a uma conta de teste.

### V0.5.0 — piloto operacional iMile

- usar carga real controlada e tracking pertencente ao entregador;
- abrir a pesquisa correta após o registro no Delivery Hub;
- concluir manualmente o POD dentro da iMile;
- manter “despachado” diferente de “baixa confirmada”;
- testar falha de rede, app fechado e retorno entre aplicativos;
- executar um turno supervisionado com poucos entregadores;
- somente depois avaliar `PRODUCTION_VALIDATED`.

### Etapas seguintes

- V0.5.x: aviso não bloqueante de atualização do Delivery Hub, preservação da
  IndexedDB e política de rollback;
- V0.6.x: engenharia e adaptador Anjun, isolados das regras iMile;
- V0.7.x: obtenção/análise do APK operacional J&T e adaptador próprio;
- V0.8.x: assinatura definitiva, CI/CD, privacidade, retenção e observabilidade;
- V0.9.x: piloto de dia completo, depois 10 entregadores;
- V1.0.0: primeira operação de produção aprovada.

## 6. Política de atualização

Quando a transportadora mudar de versão:

1. o Delivery Hub detecta o novo `versionCode`;
2. não envia URI para uma versão desconhecida;
3. copia o tracking e abre o aplicativo manualmente;
4. registra o estágio técnico silenciosamente;
5. o suporte compara versões e homologa um novo contrato;
6. o kill switch pode desativar o Deep Link sem lançar outro APK.

O entregador recebe apenas instruções operacionais curtas e não decide opções
técnicas. O `ADMIN` da empresa e o `SUPORTE` da plataforma continuam distintos.

## 7. Capacidade e crescimento

O piloto inicial de uma empresa e aproximadamente 10 entregadores permanece
compatível com o plano Spark, pois os aparelhos fazem chamadas REST curtas e a
telemetria é pequena, limitada e sem fotos. Arquivos pesados não devem ir para
o Realtime Database.

As portas da Clean Architecture permitem migrar posteriormente para API própria,
banco relacional e armazenamento de objetos sem reescrever scanner, domínio ou
fluxo do entregador. A migração para infraestrutura paga deve ser acionada por
uso real, custo, retenção e disponibilidade, não por acoplamento ao Firebase.

## 8. Critérios para V1.0.0

- [x] carga chega somente ao entregador correto;
- [x] operação sobrevive offline e ao reinício;
- [x] reenvio não duplica entrega;
- [x] falha externa não impede registro físico;
- [ ] uma transportadora validada num turno operacional completo;
- [ ] suporte recebendo logs reais e acionáveis;
- [ ] atualização do Hub preservando IndexedDB/Outbox;
- [ ] assinatura, segurança, privacidade e release concluídos;
- [ ] piloto com 10 entregadores aprovado.

## 9. Próxima ação objetiva

Seguir `docs/V0.4.8.2_ADMIN_REPARO_SCANNER.md` e depois concluir
`docs/V0.4.8_CONTRATOS_FALLBACK_SUPORTE.md`. Anjun e J&T permanecem isoladas
até o fechamento da V0.4.8 e do piloto iMile V0.5.0.
