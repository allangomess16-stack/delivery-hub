# Diagnóstico Firebase Spark — Delivery Hub V0.4.7

**Data:** 08/09/2026

## Conclusão

A preocupação com o limite do plano Spark procede, mas o limite considera
clientes simultaneamente conectados ao Realtime Database, não o total de
entregadores cadastrados. A documentação oficial informa 100 conexões
simultâneas no Spark.

O código inicial da V0.4.7 ainda usava o SDK do Realtime Database em pontos
operacionais. A correção adotou um desenho híbrido:

| Cliente | Transporte | Conexão persistente |
|---|---|---|
| APK do entregador | REST autenticado | Não |
| Outbox | REST `PUT` condicional | Não |
| Admin web | SDK + `onValue()` | Sim, necessária |
| Firebase Authentication | SDK Auth | Não ocupa conexão do banco |

## Diagnóstico dos arquivos solicitados

### `destino-sincronizacao-firebase.ts`

Antes utilizava `runTransaction()` do SDK. Agora usa
`ClienteRealtimeRest.criarSeAusente()`, com `PUT` e
`if-match: null_etag`. O UUID continua no caminho remoto e uma retransmissão
não sobrescreve a operação existente.

### `operacoes-firebase.ts`

Nunca abriu conexão. É um módulo puro de serialização, validação e seleção da
operação mais recente. Foi mantido sem acoplamento de transporte.

### `armazenamento-realtime-firebase.ts`

Antes utilizava `get()`, `set()` e `remove()` do SDK. Agora delega GET, PUT e
DELETE ao cliente REST.

## Outros pontos encontrados

Apenas migrar os três arquivos não seria suficiente. Também foram corrigidos:

- leitura de usuário autenticado;
- leitura e publicação de cargas;
- leitura de operações aplicadas à carga;
- assinatura `.info/connected` em todos os aparelhos;
- assinatura remota do entregador.

O SDK do banco permanece em dois pontos exclusivos do Admin: gestão de contas
e observação em tempo real. Criar a instância `Database` não abre sozinho uma
conexão; o entregador não executa esses adaptadores administrativos.

## Segurança e resiliência

- O REST reutiliza o ID token temporário do Firebase Authentication.
- Nenhuma chave administrativa ou segredo é incluído no APK.
- URLs autenticadas nunca são incluídas nas mensagens de erro.
- Há timeout de 15 segundos.
- Falhas permanecem na Outbox e respeitam retry/backoff.
- Regras do Realtime Database continuam autorizando por `auth.uid` e
  `entregadorId`.
- O Admin observa caminhos específicos, nunca a raiz completa.

## Limites relevantes do Spark

Na tabela oficial vigente em 08/09/2026:

- 100 conexões simultâneas;
- 1 GB armazenado no Realtime Database;
- 10 GB/mês baixados.

Os 10 GB citados para armazenamento pertencem ao Firebase Hosting; no Realtime
Database o limite gratuito de armazenamento é 1 GB. Para o piloto com cerca de
10 entregadores e eventos textuais pequenos, esse volume ainda é amplo. Fotos
e vídeos não devem ser armazenados dentro do Realtime Database.

## Fontes oficiais

- https://firebase.google.com/docs/database/usage/limits
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/database/rest/auth
- https://firebase.google.com/docs/reference/rest/database

## Pendência de homologação

O transporte foi validado por testes automatizados. Ainda é necessário provar
no projeto Firebase real:

1. carga publicada pelo Admin;
2. leitura pelo APK;
3. entrega criada offline;
4. envio REST após reconexão;
5. atualização em tempo real no Admin;
6. ausência de duplicidade pelo UUID.
