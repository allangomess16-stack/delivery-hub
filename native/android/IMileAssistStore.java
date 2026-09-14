package com.deliveryhub.app.nativebridge;

import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Estado local, curto e sem tracking: apagado automaticamente em dois minutos. */
final class IMileAssistStore {
    private static final String PREFS = "deliveryhub_imile_assist";
    private static final long TTL_MILLIS = 2 * 60 * 1000L;
    private static final Set<String> RECEIVERS = new HashSet<>(Arrays.asList(
        "PROPRIO", "PORTARIA", "OUTROS", "FUNCIONARIO", "CONJUGE",
        "ASSOCIACAO_BAIRRO", "VIZINHO", "PROPRIETARIO", "EMPREGADO", "FAMILIAR"
    ));
    private static final Set<String> DOCUMENTS = new HashSet<>(Arrays.asList(
        "CPF", "RG", "CNH", "PASSAPORTE", "OUTRO"
    ));

    static boolean enabled(Context context) {
        String enabled = Settings.Secure.getString(
            context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        return enabled != null
            && enabled.toLowerCase().contains("com.deliveryhub.app")
            && enabled.contains("IMileAccessibilityService");
    }

    static String prepare(Context context, String receiver, String name, String documentType,
                          String documentNumber, String notes) {
        if (!RECEIVERS.contains(receiver) || name.isEmpty() || name.length() > 160
            || !DOCUMENTS.contains(documentType) || documentNumber.isEmpty()
            || documentNumber.length() > 80 || notes.length() > 500) {
            return "REVISAO_MANUAL";
        }
        Session session = new Session();
        // A relacao fica registrada no Hub, mas a iMile pode pular essa tela
        // e abrir direto em Confirmar. Nenhuma opcao e tocada automaticamente.
        session.receiverDescription = receiver;
        session.name = name;
        session.documentType = documentType;
        session.documentNumber = documentNumber;
        session.notes = notes;
        session.createdAt = System.currentTimeMillis();
        write(context, session, "PRONTA", "Assistencia pronta. A iMile sera aberta para conferencia.");
        return enabled(context) ? "PRONTA" : "DESATIVADA";
    }

    static Session read(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long createdAt = prefs.getLong("createdAt", 0L);
        if (createdAt == 0L || System.currentTimeMillis() - createdAt > TTL_MILLIS) {
            prefs.edit().clear().apply();
            return null;
        }
        Session session = new Session();
        session.receiverDescription = prefs.getString("receiverDescription", "");
        session.name = prefs.getString("name", "");
        session.documentType = prefs.getString("documentType", "CPF");
        session.documentNumber = prefs.getString("documentNumber", "");
        session.notes = prefs.getString("notes", "");
        session.createdAt = createdAt;
        session.receiverDone = prefs.getBoolean("receiverDone", false);
        session.formDone = prefs.getBoolean("formDone", false);
        session.packageOpened = prefs.getBoolean("packageOpened", false);
        session.confirmDeliveryStarted = prefs.getBoolean("confirmDeliveryStarted", false);
        return session;
    }

    static void write(Context context, Session session, String status, String message) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("receiverDescription", session.receiverDescription)
            .putString("name", session.name)
            .putString("documentType", session.documentType)
            .putString("documentNumber", session.documentNumber)
            .putString("notes", session.notes)
            .putLong("createdAt", session.createdAt)
            .putBoolean("receiverDone", session.receiverDone)
            .putBoolean("formDone", session.formDone)
            .putBoolean("packageOpened", session.packageOpened)
            .putBoolean("confirmDeliveryStarted", session.confirmDeliveryStarted)
            .putString("status", status)
            .putString("message", message)
            .apply();
    }

    static void status(Context context, String status, String message) {
        Session session = read(context);
        if (session != null) write(context, session, status, message);
    }

    static String message(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("message", "A assistencia foi preparada para revisao.");
    }

    static final class Session {
        String receiverDescription = "";
        String name = "";
        String documentType = "CPF";
        String documentNumber = "";
        String notes = "";
        long createdAt;
        boolean receiverDone;
        boolean formDone;
        boolean packageOpened;
        boolean confirmDeliveryStarted;

        boolean expired() {
            return createdAt == 0L || System.currentTimeMillis() - createdAt > TTL_MILLIS;
        }
    }
}
