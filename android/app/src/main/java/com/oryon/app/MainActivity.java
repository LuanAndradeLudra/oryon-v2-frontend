package com.oryon.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // CRITICAL: installSplashScreen ANTES de super.onCreate ativa a SplashScreen API
        // do androidx.core. Sem este metodo, o atributo postSplashScreenTheme do
        // AppTheme.NoActionBarLaunch e' IGNORADO — a activity permanece no tema de launch
        // (Theme.SplashScreen) cujo parent herda um ActionBar nativo que mostra
        // android:label="Oryon" do manifest. Resultado visual: barra preta no topo
        // com texto "Oryon" sobreposto a WebView, escondendo a logo da LoginPage.
        SplashScreen.installSplashScreen(this);

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

        // Garante que o root content nao aplique padding automatico baseado em
        // insets (manteria o WebView preso ao safe area). Retornamos os insets
        // ORIGINAIS (nao CONSUMED) para que eles cheguem ate o WebView e o
        // Capacitor exponha os valores via env(safe-area-inset-*) no CSS — sem
        // isso o JS recebe 0 em todas as direcoes e o conteudo cola na status
        // bar / nav bar.
        View rootView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
            v.setPadding(0, 0, 0, 0);
            return insets;
        });
    }
}
