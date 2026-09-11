package com.deliveryhub.app.nativebridge;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.Locale;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "NativeBridge")
public final class NativeBridgePlugin extends Plugin {
    private static final String IMILE_PACKAGE = "com.imile.redelivery";
    private static final Set<String> QUERY_ALLOWED_PACKAGES =
        Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            IMILE_PACKAGE,
            "com.anjun.supplierManagement"
        )));
    private static final Pattern IMILE_DEEP_LINK = Pattern.compile(
        "^crredelivery:\\?requestCode=[A-Za-z0-9_-]{1,64}$"
    );
    private static final Pattern SAFE_TEXT = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    private static final Set<String> UPDATE_HOSTS =
        Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "deliveryhubsistem.web.app",
            "deliveryhubsistem.firebaseapp.com",
            "github.com"
        )));

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        String packageName = normalized(call.getString("packageName"));
        if (!QUERY_ALLOWED_PACKAGES.contains(packageName)) {
            call.resolve(appInfo(packageName, false, null, null));
            return;
        }

        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(
                packageName,
                0
            );
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;

            call.resolve(appInfo(
                packageName,
                true,
                info.versionName,
                Long.toString(versionCode)
            ));
        } catch (PackageManager.NameNotFoundException exception) {
            call.resolve(appInfo(packageName, false, null, null));
        } catch (RuntimeException exception) {
            call.resolve(appInfo(packageName, false, null, null));
        }
    }

    @PluginMethod
    public void openDeepLink(PluginCall call) {
        String rawUri = normalized(call.getString("uri"));
        String packageName = normalized(call.getString("packageName"));

        if (!IMILE_PACKAGE.equals(packageName) || !IMILE_DEEP_LINK.matcher(rawUri).matches()) {
            call.resolve(deepLinkResult(
                "URI_REJEITADA",
                false,
                packageName,
                "A combinacao de URI e aplicativo nao esta autorizada."
            ));
            return;
        }

        try {
            Uri uri = Uri.parse(rawUri);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(uri);
            intent.setPackage(packageName);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            PackageManager packageManager = getContext().getPackageManager();
            if (intent.resolveActivity(packageManager) == null) {
                boolean installed = isInstalled(packageManager, packageName);
                call.resolve(deepLinkResult(
                    installed ? "ACAO_NAO_SUPORTADA" : "PACOTE_NAO_INSTALADO",
                    false,
                    packageName,
                    installed
                        ? "O aplicativo nao declarou uma entrada compativel."
                        : "O aplicativo de destino nao esta instalado."
                ));
                return;
            }

            getContext().startActivity(intent);
            call.resolve(deepLinkResult(
                "DESPACHADO",
                true,
                packageName,
                "Intent explicita enviada ao aplicativo de destino."
            ));
        } catch (ActivityNotFoundException exception) {
            call.resolve(deepLinkResult(
                "ACAO_NAO_SUPORTADA",
                false,
                packageName,
                "Nenhuma Activity compativel foi encontrada."
            ));
        } catch (SecurityException exception) {
            call.resolve(deepLinkResult(
                "FALHA_NATIVA",
                false,
                packageName,
                "O Android bloqueou a abertura do aplicativo."
            ));
        } catch (RuntimeException exception) {
            call.resolve(deepLinkResult(
                "FALHA_NATIVA",
                false,
                packageName,
                "Nao foi possivel processar a solicitacao Android."
            ));
        }
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = normalized(call.getString("packageName"));
        if (!QUERY_ALLOWED_PACKAGES.contains(packageName)) {
            call.resolve(deepLinkResult(
                "ACAO_NAO_SUPORTADA",
                false,
                packageName,
                "O aplicativo solicitado nao esta autorizado."
            ));
            return;
        }

        try {
            PackageManager packageManager = getContext().getPackageManager();
            Intent intent = packageManager.getLaunchIntentForPackage(packageName);
            if (intent == null) {
                call.resolve(deepLinkResult(
                    isInstalled(packageManager, packageName)
                        ? "ACAO_NAO_SUPORTADA"
                        : "PACOTE_NAO_INSTALADO",
                    false,
                    packageName,
                    "O aplicativo nao possui uma abertura disponivel."
                ));
                return;
            }
            intent.setPackage(packageName);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(deepLinkResult(
                "DESPACHADO",
                true,
                packageName,
                "Aplicativo aberto diretamente."
            ));
        } catch (ActivityNotFoundException exception) {
            call.resolve(deepLinkResult(
                "PACOTE_NAO_INSTALADO",
                false,
                packageName,
                "O aplicativo de destino nao foi encontrado."
            ));
        } catch (SecurityException exception) {
            call.resolve(deepLinkResult(
                "FALHA_NATIVA",
                false,
                packageName,
                "O Android bloqueou a abertura do aplicativo."
            ));
        } catch (RuntimeException exception) {
            call.resolve(deepLinkResult(
                "FALHA_NATIVA",
                false,
                packageName,
                "Nao foi possivel abrir o aplicativo."
            ));
        }
    }

    @PluginMethod
    public void copyText(PluginCall call) {
        String text = normalized(call.getString("text"));
        if (!SAFE_TEXT.matcher(text).matches()) {
            call.resolve(copyResult(
                "TEXTO_REJEITADO",
                false,
                "O texto nao corresponde a um codigo de rastreio seguro."
            ));
            return;
        }

        try {
            ClipboardManager clipboard = (ClipboardManager) getContext()
                .getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) {
                call.resolve(copyResult("FALHA_NATIVA", false, "Clipboard indisponivel."));
                return;
            }
            clipboard.setPrimaryClip(ClipData.newPlainText("Codigo de rastreio", text));
            call.resolve(copyResult("COPIADO", true, "Codigo copiado."));
        } catch (RuntimeException exception) {
            call.resolve(copyResult("FALHA_NATIVA", false, "Nao foi possivel copiar o codigo."));
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        try {
            if (getActivity() != null) getActivity().moveTaskToBack(true);
            call.resolve();
        } catch (RuntimeException exception) {
            call.reject("Nao foi possivel colocar o aplicativo em segundo plano.");
        }
    }

    @PluginMethod
    public void openUpdateUrl(PluginCall call) {
        String rawUrl = normalized(call.getString("url"));
        try {
            Uri uri = Uri.parse(rawUrl);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !UPDATE_HOSTS.contains(host)
                || !uri.getPath().toLowerCase(Locale.ROOT).endsWith(".apk")) {
                JSObject denied = new JSObject();
                denied.put("opened", false);
                call.resolve(denied);
                return;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject opened = new JSObject();
            opened.put("opened", true);
            call.resolve(opened);
        } catch (RuntimeException exception) {
            JSObject failed = new JSObject();
            failed.put("opened", false);
            call.resolve(failed);
        }
    }

    private boolean isInstalled(PackageManager packageManager, String packageName) {
        try {
            packageManager.getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException exception) {
            return false;
        }
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim();
    }

    private JSObject appInfo(
        String packageName,
        boolean installed,
        String versionName,
        String versionCode
    ) {
        JSObject result = new JSObject();
        result.put("packageName", packageName);
        result.put("installed", installed);
        if (versionName != null) result.put("versionName", versionName);
        if (versionCode != null) result.put("versionCode", versionCode);
        return result;
    }

    private JSObject deepLinkResult(
        String code,
        boolean dispatched,
        String packageName,
        String message
    ) {
        JSObject result = new JSObject();
        result.put("code", code);
        result.put("dispatched", dispatched);
        result.put("packageName", packageName);
        result.put("message", message);
        return result;
    }

    private JSObject copyResult(String code, boolean copied, String message) {
        JSObject result = new JSObject();
        result.put("code", code);
        result.put("copied", copied);
        result.put("message", message);
        return result;
    }
}
