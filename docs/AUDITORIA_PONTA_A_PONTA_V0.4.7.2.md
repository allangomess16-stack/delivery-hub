# Auditoria ponta a ponta — Delivery Hub V0.4.7.2

**Data:** 08/09/2026  
**Escopo:** planilha → perfis → publicação → aparelho → entrega → Outbox → Firebase → Admin.

## Resultado executivo

O fluxo principal está coerente para um novo piloto, depois das correções desta
auditoria. A integração iMile continua sendo Nível 1: abre a pesquisa com o AWB,
mas a iMile não devolve confirmação de baixa ao Delivery Hub.

| Área | Resultado | Proteção atual |
|---|---|---|
| Token Firebase | Corrigido | token solicitado antes do `fetch`; 401 renova forçado e repete uma vez |
| Operação idempotente | Aprovado | `PUT` condicional somente no caminho imutável do UUID |
| Atualização de várias cargas | Corrigido | `PATCH` multipath atômico |
| Poison pill | Corrigido | `400/403` vira falha permanente somente daquele item; lote continua |
| Instabilidade/cota | Aprovado | backoff 5 s → 30 min e respeito a `Retry-After` para `429/5xx` |
| Leitura indevida | Aprovado | raiz negada; entregador lê somente o próprio ramo |
| Escrita abusiva | Corrigido | esquema fechado, limites de fotos/eventos e operação não apagável |
| Carga diária | Corrigido | uma carga ativa por entregador/data; nova planilha é consolidada |
| Tracking duplicado | Corrigido | bloqueio dentro da planilha e contra cargas do mesmo dia |
| Transferência | Corrigido | origem e destino persistidos no mesmo PATCH |
| Fotos | Corrigido | arquivo anterior só é removido depois da carga confirmada |
| Build sem Firebase | Corrigido | produção falha fechada; modo local exige build `localserver` |
| Exposição do código | Corrigido | source map removido de APK/Hosting operacional |

## Semântica correta de PUT e PATCH

Nem todo `PUT` é destrutivo por definição. O Delivery Hub mantém `PUT` em dois
casos de substituição completa e deliberada:

- registro integral de uma carga em seu caminho exclusivo;
- criação idempotente de operação no caminho exclusivo do UUID, com
  `if-match: null_etag`.

As alterações que envolvem mais de uma carga usam `PATCH` multipath na raiz.
Isso garante que uma transferência não remova da origem sem adicionar ao
destino e que uma distribuição não publique apenas parte dos entregadores.

## Comportamento da Outbox

- cada item é processado dentro de seu próprio `try/catch`;
- uma falha não interrompe o laço nem os outros entregadores;
- `400/401/403` definitivo é bloqueado e não consome banda em loop;
- `408`, `429` e `5xx` permanecem recuperáveis;
- o próximo envio usa backoff crescente e o maior valor entre o backoff local
  e o `Retry-After` recebido;
- o botão manual não reenvia itens classificados como permanentes;
- o UUID evita duplicar a operação quando a resposta anterior se perdeu.

## Dinâmica de adição de carga

1. A planilha é lida mantendo tracking como string sempre que o Excel o
   fornece como texto.
2. Colunas são conciliadas com perfis ativos e contas ativas.
3. Colunas vazias não geram cargas vazias.
4. Duplicidades na planilha ou nas cargas do mesmo dia bloqueiam a publicação.
5. Se o entregador já possui uma carga ativa naquela data, os pacotes novos
   entram nela; uma segunda carga invisível não é criada.
6. Todas as cargas alteradas são publicadas em um único PATCH.

## O que o teste em campo deve confirmar

- publicar uma planilha nova com um pacote adicional para o mesmo entregador e
  verificar que existe apenas uma carga diária;
- concluir uma entrega sem rede e observar `AGUARDANDO SYNC`;
- restabelecer a rede e observar fila 0 e cartão `NO HUB`;
- verificar no Admin a operação pelo mesmo UUID, sem duplicidade;
- abrir a iMile e confirmar somente a navegação/pesquisa do AWB;
- não interpretar `Baixas confirmadas = 0` como falha: retorno automático da
  transportadora ainda não existe.

## Pendências que permanecem

- publicar as novas regras no Firebase real;
- gerar e instalar o APK V0.4.7.2 auditado;
- executar o reteste Admin + aparelho;
- implementar telemetria silenciosa e painel do suporte na V0.4.8/V0.4.9;
- criar paginação/retenção de histórico antes de uma escala muito maior;
- obter confirmação real da transportadora para sair de `NO HUB` e chegar a
  `BAIXA OK`;
- reduzir o bundle JavaScript principal antes da produção.

## Evidência automatizada

- TypeScript: aprovado;
- testes: 37 arquivos, 113 testes aprovados;
- build operacional: aprovado e sem source map;
- regras: JSON e invariantes verificadas por teste estático;
- validação no emulador Firebase: pendente neste ambiente, que não permitiu o
  download do binário do emulador. A publicação pelo BAT é a validação final.

## Três riscos residuais prioritários

1. A iMile não informa ao Hub que a baixa foi concluída; o estado permanece
   `AGUARDANDO_INTEGRACAO` até existir confirmação confiável.
2. O Admin ainda observa ramos por entregador e as telas de histórico não têm
   paginação; é adequado ao piloto de 10 pessoas, não à retenção ilimitada.
3. Fotos permanecem somente no aparelho; perda física do celular antes de uma
   estratégia de upload pode eliminar a evidência.

## Redundância e organização

- removido `firebase/firebase.json`; somente `firebase.json` da raiz é ativo;
- modo local e modo operacional agora usam builds explicitamente diferentes;
- regras de integração por transportadora continuam isoladas em adaptadores;
- Outbox operacional permanece separada da futura telemetria de suporte.
