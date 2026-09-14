# Firebase — Delivery Hub

Esta pasta contém as regras e os arquivos locais da infraestrutura. A
configuração ativa da Firebase CLI fica em `firebase.json`, na raiz do projeto.

Arquivos gerados pela configuração local ficam ignorados pelo Git:

- `projeto.local.env`
- `web-sdk-config.raw.json`
- `web-sdk-config.json`

A configuração usada pelo navegador é gerada em:

- `public/firebase-config.json`

Esse arquivo é local e não acompanha o ZIP. O modelo seguro versionado é
`public/firebase-config.example.json`. Os BATs 02, 03, 07 e 09 regeneram a
configuração real a partir do projeto Firebase autenticado.

## Serviços configurados

- Firebase Authentication — Email/Senha
- Firebase Realtime Database
- Firebase Hosting
- Emulator Suite (Auth, Database e Hosting)

Cloud Storage ainda não é ativado nesta fase porque as fotos continuam no armazenamento local.
