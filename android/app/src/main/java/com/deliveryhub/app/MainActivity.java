package com.deliveryhub.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.deliveryhub.app.nativebridge.NativeBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        // O JavaScript decide a etapa anterior; o Android não encerra uma entrega em andamento.
        bridge.triggerJSEvent("deliveryhubback", "window");
    }
}
