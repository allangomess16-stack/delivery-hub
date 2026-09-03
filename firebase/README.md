# Firebase — Delivery Hub

Esta pasta contém somente infraestrutura versionável.

Arquivos gerados pela configuração local ficam ignorados pelo Git:

- `projeto.local.env`
- `web-sdk-config.raw.json`
- `web-sdk-config.json`

A configuração usada pelo navegador é gerada em:

- `public/firebase-config.json`

## Serviços configurados

- Firebase Authentication — Email/Senha
- Firebase Realtime Database
- Firebase Hosting
- Emulator Suite (Auth, Database e Hosting)

Cloud Storage ainda não é ativado nesta fase porque as fotos continuam no armazenamento local.
