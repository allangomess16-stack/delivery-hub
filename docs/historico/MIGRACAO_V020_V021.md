# Migração V0.2.0 -> V0.2.1

A V0.2.1 altera a forma de armazenar e abrir cargas.

## Mudança principal

Antes:

```text
localStorage -> carga completa -> escolha manual de entregador
```

Agora:

```text
ADMIN -> Excel -> conciliação -> CargaEntregador -> IndexedDB
ENTREGADOR -> login -> entregadorId -> somente sua carga
```

## Dados antigos

A carga de teste salva pela V0.2.0 em `localStorage` não é migrada automaticamente, porque o novo modelo precisa passar pela conciliação de perfis.

Para validar a V0.2.1, importe novamente a planilha pelo perfil Admin.

Fotos da V0.2 continuam em armazenamento separado e não foram misturadas com os novos registros de identidade.
