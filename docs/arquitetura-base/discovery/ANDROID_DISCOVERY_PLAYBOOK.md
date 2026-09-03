# Playbook de Descoberta Android

## Objetivo

Descobrir capacidades legitimamente expostas pelos aplicativos oficiais e classificar a evidência.

## 1. Identificação

```bash
adb shell pm list packages | grep -Ei "jtexpress|anjun|imile"
```

Para cada pacote:

```bash
adb shell dumpsys package com.package.real
```

Registrar:

```text
packageName
versionName
versionCode
targetSdk
firstInstallTime
lastUpdateTime
requested permissions
granted permissions
activities
services
receivers
providers
intent-filters
```

## 2. APKs e split APKs

```bash
adb shell pm path com.package.real
```

```bash
for file in $(adb shell pm path com.package.real | tr -d '\r' | cut -d':' -f2); do
  adb pull "$file"
done
```

Registrar hash dos artefatos.

## 3. Manifest

Investigar:
- `android:exported="true"`;
- `intent-filter`;
- schemes/hosts;
- MIME types;
- `ACTION_SEND`;
- `ACTION_VIEW`;
- Providers;
- permissões.

Componente exportado não significa integração útil.

## 4. JADX / strings

Buscar:

```text
waybill
tracking
tracking_code
order
order_id
awb
barcode
scan
shipment
parcel
pod
proof
recipient
receiver
signature
camera
gallery
offline
draft
```

Buscar APIs:

```text
getIntent()
getData()
getStringExtra()
Intent.ACTION_SEND
Intent.ACTION_VIEW
EXTRA_STREAM
FileProvider
MediaStore
CameraX
ActivityResultContracts
```

## 5. Hipótese

Classificar inicialmente como `MANIFEST_DISCOVERED` ou `CODE_DISCOVERED`.

## 6. ADB Test

```bash
adb shell am start \
  -n com.package.real/.SomeActivity \
  -e "tracking_code" "TEST123"
```

Para imagem, não tratar `file://` como teste válido do comportamento moderno. O fluxo real deve usar `content://` e concessão temporária de leitura.

## 7. Device Test

Validar no aparelho do entregador:
- Activity abre;
- tracking é consumido;
- imagem é aceita;
- fluxo correto é atingido;
- retorno ao Hub funciona;
- comportamento offline.

## 8. Production Validation

Somente depois de entrega real controlada.

## Limites

Não depender de bypass de autenticação, root, modificação de APK, componentes privados ou contorno de antifraude.
