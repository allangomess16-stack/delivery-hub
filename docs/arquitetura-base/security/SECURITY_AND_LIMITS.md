# Segurança e Limites de Integração

## Princípios

1. Não armazenar credenciais em texto puro.
2. Não expor tokens no cliente.
3. Não modificar APKs de terceiros.
4. Não depender de componentes privados.
5. Não contornar autenticação ou antifraude.
6. Não exigir root.
7. Não tratar capability descoberta como capability autorizada.

## Provas de entrega

Fotos, documentos e localização podem conter dados pessoais. Aplicar mínimo necessário, criptografia local quando viável, retenção configurável, compressão e exclusão conforme política.

## Telemetria

Preferir apenas:

```text
companyId
packageName
versionCode
integrationStatus
errorCode
```

Evitar dados pessoais e conteúdo da prova.

## FileProvider

Usar:

```text
content:// + FLAG_GRANT_READ_URI_PERMISSION
```

Evitar `file://`.

## Package Visibility

Declarar somente packages necessários:

```xml
<queries>
    <package android:name="PACKAGE_REAL_JNT" />
    <package android:name="PACKAGE_REAL_ANJUN" />
    <package android:name="com.imile.shared" />
</queries>
```

Os dois primeiros são placeholders até confirmação.

## AccessibilityService

Não incluir como requisito da V1 inicial.
