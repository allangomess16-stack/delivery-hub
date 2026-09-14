package com.deliveryhub.app.nativebridge;

import android.app.assist.AssistStructure;
import android.content.ComponentName;
import android.os.Build;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.FillCallback;
import android.service.autofill.FillRequest;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.util.Log;

import java.util.List;

/**
 * Sonda temporária de homologação. Ela só aceita solicitações originadas da
 * iMile e registra apenas metadados técnicos; nunca lê, salva ou preenche PII.
 */
public final class DeliveryHubAutofillProbe extends AutofillService {
    private static final String TAG = "AutofillProbe";
    private static final String IMILE_PACKAGE = "com.imile.redelivery";
    private static final int MAX_FIELDS_LOGGED = 40;

    @Override
    public void onFillRequest(
        FillRequest request,
        CancellationSignal cancellationSignal,
        FillCallback callback
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || request == null) {
            callback.onSuccess(null);
            return;
        }

        try {
            List<FillRequest.FillContext> contexts = request.getFillContexts();
            if (contexts == null || contexts.isEmpty()) {
                log("FILL_REQUEST|status=NO_CONTEXT");
                callback.onSuccess(null);
                return;
            }

            AssistStructure structure = contexts.get(contexts.size() - 1).getStructure();
            ComponentName activity = structure == null ? null : structure.getActivityComponent();
            String packageName = activity == null ? "" : activity.getPackageName();

            if (!IMILE_PACKAGE.equals(packageName)) {
                callback.onSuccess(null);
                return;
            }

            int windows = structure.getWindowNodeCount();
            log("FILL_REQUEST|package=" + IMILE_PACKAGE + "|windows=" + windows);
            int[] count = {0};
            for (int index = 0; index < windows && count[0] < MAX_FIELDS_LOGGED; index++) {
                AssistStructure.WindowNode window = structure.getWindowNodeAt(index);
                if (window != null) traverse(window.getRootViewNode(), count);
            }
            if (count[0] == 0) log("FIELD_NONE|package=" + IMILE_PACKAGE);
        } catch (RuntimeException ignored) {
            log("FILL_REQUEST|status=STRUCTURE_UNAVAILABLE");
        }

        // Esta é uma sonda: não devolve Dataset e não altera nenhum campo.
        callback.onSuccess(null);
    }

    @Override
    public void onSaveRequest(SaveRequest request, SaveCallback callback) {
        // Não registra nem aprende dados; evita qualquer persistência acidental.
        callback.onSuccess();
    }

    private void traverse(AssistStructure.ViewNode node, int[] count) {
        if (node == null || count[0] >= MAX_FIELDS_LOGGED) return;

        CharSequence className = node.getClassName();
        String[] hints = node.getAutofillHints();
        boolean hasAutofillId = node.getAutofillId() != null;
        boolean isEditText = className != null
            && className.toString().contains("EditText");
        int hintCount = hints == null ? 0 : hints.length;

        if (hasAutofillId || isEditText || hintCount > 0) {
            count[0]++;
            String safeClass = className == null ? "unknown" : className.toString();
            log("FIELD|class=" + safeClass
                + "|autofillId=" + (hasAutofillId ? "present" : "absent")
                + "|hintCount=" + hintCount);
        }

        for (int index = 0; index < node.getChildCount() && count[0] < MAX_FIELDS_LOGGED; index++) {
            traverse(node.getChildAt(index), count);
        }
    }

    private static void log(String event) {
        Log.i(TAG, "DH_AUTOFILL_PROBE|" + event);
    }
}
