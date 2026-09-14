package com.deliveryhub.app.nativebridge;

import android.accessibilityservice.AccessibilityService;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

/**
 * Assistencia opt-in para a iMile mapeada em aparelho real. Nao usa gestos
 * globais, nao le outros pacotes e nunca toca em foto, assinatura ou Entregue.
 */
public final class IMileAccessibilityService extends AccessibilityService {
    private static final String IMILE_PACKAGE = "com.imile.redelivery";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null
            || !IMILE_PACKAGE.contentEquals(event.getPackageName())) return;
        IMileAssistStore.Session session = IMileAssistStore.read(this);
        if (session == null || session.expired()) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        try {
            List<AccessibilityNodeInfo> nodes = flatten(root);
            // A iMile pode abrir direto no formulario, mas a gravacao real
            // mostrou a sequencia Tarefas -> Confirmar -> Provas -> Confirmar.
            if (!session.formDone && temFormulario(nodes)) {
                session.packageOpened = true;
                session.confirmDeliveryStarted = true;
                preencherFormulario(session, nodes);
            } else if (!session.packageOpened) {
                abrirEncomendaOuConfirmarTarefa(session, nodes);
            } else if (!session.confirmDeliveryStarted) {
                confirmarEntrega(session, nodes);
            }
        } catch (RuntimeException ignored) {
            // Falha de layout nao pode travar a iMile; a sessao segue manual.
            IMileAssistStore.status(this, "REVISAO_MANUAL", "A tela da iMile mudou. Revise e preencha manualmente.");
        }
    }

    @Override
    public void onInterrupt() {
        // Nenhum feedback sonoro ou toque e produzido pelo servico.
    }

    private void abrirEncomendaOuConfirmarTarefa(IMileAssistStore.Session session, List<AccessibilityNodeInfo> nodes) {
        AccessibilityNodeInfo alvo = porRotulo(nodes, "Abrir encomenda");
        if (alvo == null) alvo = porRotulo(nodes, "Abrir a encomenda");
        if (alvo == null) alvo = porRotulo(nodes, "Abrir pacote");
        if (alvo != null && clicarControle(alvo)) {
            session.packageOpened = true;
            IMileAssistStore.write(this, session, "ENCOMENDA_ABERTA", "Encomenda aberta. Aguardando Confirmar.");
            return;
        }

        // Na captura real a tela era Tarefas de entrega e o botao se chamava
        // apenas Confirmar. O titulo evita tocar em Confirmar na tela final.
        if (!temListaDeTarefas(nodes)) return;
        alvo = porRotulo(nodes, "Confirmar");
        if (alvo == null || !clicarControle(alvo)) return;
        session.packageOpened = true;
        IMileAssistStore.write(this, session, "TAREFA_CONFIRMADA", "Tarefa confirmada. Aguarde a tela Provas.");
    }

    private void confirmarEntrega(IMileAssistStore.Session session, List<AccessibilityNodeInfo> nodes) {
        AccessibilityNodeInfo alvo = porRotulo(nodes, "Confirmar entrega");
        if (alvo == null) alvo = porRotulo(nodes, "Confirmar Entrega");
        if (alvo != null && clicarControle(alvo)) {
            session.confirmDeliveryStarted = true;
            IMileAssistStore.write(this, session, "CONFIRMACAO_ABERTA", "Confirmacao aberta. Aguarde os dados.");
        }
    }

    private static boolean temFormulario(List<AccessibilityNodeInfo> nodes) {
        return editableAfter(nodes, "Nome Completo") != null
            && editableAfter(nodes, "Número do Documento") != null;
    }

    private static boolean temListaDeTarefas(List<AccessibilityNodeInfo> nodes) {
        return porRotulo(nodes, "Tarefas de entrega") != null;
    }

    private static AccessibilityNodeInfo porRotulo(List<AccessibilityNodeInfo> nodes, String rotulo) {
        int index = indexByLabel(nodes, rotulo);
        return index < 0 ? null : nodes.get(index);
    }

    private static boolean clicarControle(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo atual = node;
        for (int nivel = 0; nivel < 5 && atual != null; nivel++) {
            if (atual.isClickable() && atual.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            atual = atual.getParent();
        }
        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
    }

    private void preencherFormulario(IMileAssistStore.Session session, List<AccessibilityNodeInfo> nodes) {
        AccessibilityNodeInfo nome = editableAfter(nodes, "Nome Completo");
        AccessibilityNodeInfo documento = editableAfter(nodes, "Número do Documento");
        if (nome == null || documento == null) {
            IMileAssistStore.status(this, "AGUARDANDO_FORMULARIO", "Aguardando o formulario Confirmar da iMile.");
            return;
        }

        session.receiverDone = true;
        IMileAssistStore.write(this, session, "PREENCHENDO", "Formulario iMile detectado. Preenchendo dados de recebimento.");
        boolean nomeOk = setWhenEmpty(nome, session.name);
        boolean documentoOk = setWhenEmpty(documento, session.documentNumber);
        boolean notasOk = true;
        if (!session.notes.isEmpty()) {
            AccessibilityNodeInfo notas = editableAfter(nodes, "Notas de Entrega");
            notasOk = notas != null && setWhenEmpty(notas, session.notes);
        }

        session.formDone = nomeOk && documentoOk && notasOk;
        if (session.formDone) {
            String aviso = "Dados preenchidos. Confira documento, foto e assinatura; toque em Entregue manualmente.";
            if (!"CPF".equals(session.documentType)) {
                aviso = "Nome e numero preenchidos. Selecione " + session.documentType + " manualmente; depois confira foto e assinatura.";
            }
            IMileAssistStore.write(this, session, "PREENCHIDO", aviso);
        }
    }

    private static boolean setWhenEmpty(AccessibilityNodeInfo node, String value) {
        CharSequence atual = node.getText();
        if (atual != null && atual.toString().trim().length() > 0) return true;
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    private static AccessibilityNodeInfo editableAfter(List<AccessibilityNodeInfo> nodes, String label) {
        int index = indexByLabel(nodes, label);
        if (index < 0) return null;
        for (int cursor = index + 1; cursor < nodes.size(); cursor++) {
            AccessibilityNodeInfo node = nodes.get(cursor);
            if (node.isEditable() || "android.widget.EditText".contentEquals(node.getClassName())) return node;
        }
        return null;
    }

    private static int indexByLabel(List<AccessibilityNodeInfo> nodes, String expected) {
        String target = normalize(expected);
        for (int index = 0; index < nodes.size(); index++) {
            AccessibilityNodeInfo node = nodes.get(index);
            CharSequence content = node.getContentDescription();
            CharSequence text = node.getText();
            // Na tela Confirmar, a iMile expõe os rótulos como texto; em
            // outras telas Flutter os mesmos rótulos podem estar no content-desc.
            if ((content != null && normalize(content.toString()).contains(target))
                || (text != null && normalize(text.toString()).contains(target))) return index;
        }
        return -1;
    }

    private static List<AccessibilityNodeInfo> flatten(AccessibilityNodeInfo root) {
        List<AccessibilityNodeInfo> result = new ArrayList<>();
        visit(root, result);
        return result;
    }

    private static void visit(AccessibilityNodeInfo node, List<AccessibilityNodeInfo> result) {
        result.add(node);
        for (int index = 0; index < node.getChildCount(); index++) {
            AccessibilityNodeInfo child = node.getChild(index);
            if (child != null) visit(child, result);
        }
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .trim()
            .toLowerCase();
    }
}
