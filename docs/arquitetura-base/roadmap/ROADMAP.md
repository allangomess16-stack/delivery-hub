# Roadmap

## Dia 0 — Descoberta

- confirmar apps;
- package names;
- versões;
- Manifest;
- capabilities;
- fluxo real.

Saída: primeiro `IntegrationRegistry` real.

## V0 — Hub operacional local

- cadastro/importação;
- scanner;
- identificação da empresa;
- recebedor;
- foto;
- horário;
- localização;
- offline;
- histórico;
- entregas por empresa;
- pendências externas;
- estado físico separado do sistêmico.

A V0 deve funcionar sem integração externa.

## V1 — Android Bridge

- PackageManager;
- leitura da versão instalada;
- `<queries>`;
- App Launch;
- Clipboard;
- FileProvider;
- `content://`;
- ACTION_SEND;
- Deep Links;
- fallback automático.

## V1.1 — Registry remoto

- capabilities por versão;
- telemetria de versão desconhecida;
- feature flags;
- atualização segura.

## V1.2 — Adapters validados

- J&T;
- Anjun;
- iMile.

## V2 — Integrações oficiais

Quando disponíveis: APIs, portal de parceiros, importações e autenticação oficial.

## Último recurso

AccessibilityService somente após provar que os outros níveis são insuficientes e avaliar política, segurança e manutenção.
