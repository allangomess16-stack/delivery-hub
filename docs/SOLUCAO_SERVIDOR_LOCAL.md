# Servidor local — diagnóstico

## Correções da V0.1.1

### 1. `vite não é reconhecido`

A versão anterior verificava apenas se a pasta `node_modules` existia.

Uma instalação interrompida pode criar essa pasta sem instalar o Vite.

Agora o servidor verifica diretamente:

```text
node_modules\.bin\vite.cmd
```

Se estiver ausente, `BAT\02_PREPARAR_AMBIENTE.bat` executa automaticamente:

```text
npm install --include=dev
```

ou `npm ci --include=dev` quando houver `package-lock.json`.

### 2. IP exibindo erro `Where-Object`

A detecção anterior utilizava uma expressão PowerShell que apresentou incompatibilidade no Windows testado.

Agora o IP é obtido pela rota padrão do Windows:

```text
route print -4 0.0.0.0
```

com fallback para `ipconfig`.

### 3. BAT chamando `npm`

No Windows, `npm`/`npx` são arquivos `.cmd`.

Os scripts agora usam:

```text
call npm ...
call npx ...
```

para que o controle sempre retorne ao BAT chamador.

## Uso

Execute:

```text
BAT\01_SERVIDOR_LOCAL.bat
```

Na primeira execução ele prepara o projeto automaticamente.

O prompt exibirá:

```text
ACESSO NO COMPUTADOR
http://localhost:5173

IP DESTE COMPUTADOR
192.168.x.x

ACESSO PELO CELULAR
http://192.168.x.x:5173
```

Celular e computador devem estar na mesma rede.
