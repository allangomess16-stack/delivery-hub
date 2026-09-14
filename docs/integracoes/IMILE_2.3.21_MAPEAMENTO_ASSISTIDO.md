# iMile 2.3.21 — mapeamento para preenchimento assistido

## Evidência observada

- pacote: `com.imile.redelivery`;
- Activity única: `com.imile.redelivery.MainActivity`;
- framework: Flutter em release;
- não há `resource-id` confiável para os campos;
- a seleção deve usar `content-desc` e campos editáveis consecutivos no
  `ScrollView`.

## Contrato V0.5.9

| Etapa | Âncora Flutter observada | Ação do Delivery Hub |
| --- | --- | --- |
| Relação | variável entre fluxos | fica registrada no Hub; não é tocada automaticamente |
| Tarefa | tela `Tarefas de entrega` + botão `Confirmar` | toca o controle clicável e aguarda a tela Provas |
| Provas | `Provas`, câmera e `Enviar` | foto e envio continuam sob ação do entregador |
| Nome | rótulo visual/`content-desc` `Nome Completo` + próximo `EditText` | preenche se estiver vazio |
| Documento | rótulo visual/`content-desc` `Número do Documento` + próximo `EditText` | preenche se estiver vazio |
| Notas | rótulo `Notas de Entrega` + próximo `EditText` | preenche se informado |
| Tipo de documento | seletor `Tipo de Documento` | CPF permanece no padrão; os demais são conferidos pelo entregador |
| Foto / assinatura / baixa | `Assinatura do cliente` e `Entregue` | nunca tocados pelo serviço |

## Regras de segurança

1. O serviço de acessibilidade é desativado por padrão e só funciona após o
   entregador habilitá-lo nas Configurações do Android.
2. A sessão contém apenas os dados já confirmados no Hub e expira em dois
   minutos.
3. O serviço ignora qualquer aplicativo que não seja a iMile.
4. Layout inesperado resulta em revisão manual; não há tentativa de adivinhar
   um campo e não existe toque automático em **Entregue**.

## Roteiro de teste

1. Registre foto, relação, nome, CPF/documento e assinatura no Hub.
2. No resultado, toque em **ATIVAR/PREPARAR PREENCHIMENTO IMILE** e habilite
   `Delivery Hub • preenchimento iMile` uma única vez no Android.
3. Volte ao Hub e toque em **ABRIR NOVAMENTE IMILE**.
4. Confira os dados, faça foto/assinatura no aplicativo da iMile e confirme a
   baixa manualmente.
