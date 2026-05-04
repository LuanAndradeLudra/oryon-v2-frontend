package com.oryon.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // EdgeToEdge.enable() ANTES de super.onCreate — define que o decor view
        // deve estender ate as bordas. SystemBarStyle.dark = icones brancos.
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );

        super.onCreate(savedInstanceState);

        // Belt-and-suspenders pra Samsung One UI / Android 16
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }

        // CRITICAL — Capacitor's BridgeActivity normalmente aplica padding nos
        // filhos baseado em WindowInsets. Sem isso, o WebView ficaria limitado
        // ao safe area (deixando barras cinzas no topo e embaixo). Consumindo
        // os insets aqui no root content garante que o WebView ocupe a tela
        // inteira (0,0 ate width,height). O JS handle seus proprios safe-area
        // insets via env(safe-area-inset-*) no CSS.
        View rootView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
            v.setPadding(0, 0, 0, 0);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
