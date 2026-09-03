# Teste da V0.2.1

## 1. Iniciar

Execute:

```text
TESTAR_V021.bat
```

## 2. Entrar como administrador

```text
admin@deliveryhub.local
admin123
```

## 3. Importar a planilha

A tela de conciliação exibirá cada coluna do Excel.

Para colunas desconhecidas:

- `VINCULAR`: associa a um perfil existente;
- `CRIAR PERFIL`: cria um perfil operacional novo usando aquela coluna como primeiro alias.

A distribuição fica bloqueada enquanto existirem desconhecidos, conflitos ou perfis inativos.

## 4. Validar isolamento do entregador

Para conseguir testar o login mock já nesta versão, vincule **uma coluna real da planilha** ao perfil:

```text
Entregador Teste
ENT-TESTE
```

Depois clique em `DISTRIBUIR CARGAS`, saia do Admin e entre com:

```text
entregador@deliveryhub.local
entrega123
```

Esse login deverá enxergar somente os pacotes que foram vinculados ao `ENT-TESTE`.

## 5. Limite proposital desta versão

A V0.2.1 valida identidade, conciliação e isolamento **dentro do mesmo armazenamento local**.

Ela ainda não envia cargas entre aparelhos diferentes. A sincronização entre o aparelho da base e os celulares dos entregadores entrará quando o adaptador remoto (Firebase) for implementado.

Essa limitação não afeta o desenho de domínio: scanner, fotos e entrega já trabalham sobre `CargaEntregador`, e o repositório remoto poderá substituir o local por injeção de dependência.
