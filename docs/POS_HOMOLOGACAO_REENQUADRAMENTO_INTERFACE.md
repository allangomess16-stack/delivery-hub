# Pós-homologação — reenquadramento da interface

Esta etapa está CONGELADA enquanto GitHub → APK → homologação no celular é validado.

Antes de voltar a adicionar novas funções ao Delivery Hub, revisar a camada de
interface para impedir crescimento difícil de manter.

## Objetivos

1. Reduzir responsabilidades acumuladas em `src/interface/app.ts`.
2. Separar estado transitório de UI do estado operacional sincronizado.
3. Preservar scroll/filtros/foco em listas extensas.
4. Evitar reconstrução de tela/lista inteira para alterações localizadas.
5. Aplicar atualização granular de DOM para pacote/status/contadores.
6. Usar delegação de eventos nas listas de pacotes/cargas.
7. Introduzir Bottom Sheet para ações contextuais onde trouxer ganho de UX.
8. Garantir comportamento mobile:
   - botão Voltar do Android;
   - teclado;
   - safe areas;
   - foco;
   - bloqueio da tela de fundo;
   - confirmação de alterações não salvas.
9. Manter apenas um contexto principal de rolagem por tela.
10. Não transformar Vanilla TypeScript em um framework artesanal.

## Regra de renderização

Re-renderização completa continua aceitável para mudança real de tela/rota,
inicialização ou mudança estrutural da view.

Para mutações localizadas de pacote, carga, filtro, status e totalizadores,
preferir mutação granular do DOM.

## Estado

Estado operacional:
- tracking;
- status físico;
- status externo;
- evidências;
- recebedor;
- transferências;
- sincronização.

Persistência:
- aplicação;
- IndexedDB;
- Firebase.

Estado de UI:
- filtro;
- scroll;
- Bottom Sheet;
- item selecionado;
- foco.

Persistência:
- memória da tela;
- `sessionStorage` apenas quando necessário.

Nunca sincronizar estado visual no Firebase.

## Offline-first

Atualização visual não deve depender da resposta do Firebase.

Fluxo esperado:

```text
ação do entregador
→ caso de uso
→ persistência local confirmada
→ UI atualiza
→ fila/outbox
→ sincronização remota
```

Esta etapa deve ser feita antes da próxima expansão funcional após a homologação.

## Status — V0.3.9

Etapa executada após a homologação da V0.3.8.

- `app.ts` foi reduzido;
- controladores foram introduzidos;
- estado de UI foi isolado;
- filtros/scroll/seleção passaram a ser preservados no Admin;
- Bottom Sheet contextual foi introduzido;
- primeira mutação granular foi aplicada na edição de endereço/região.

O documento permanece como guardrail arquitetural para novas telas.
