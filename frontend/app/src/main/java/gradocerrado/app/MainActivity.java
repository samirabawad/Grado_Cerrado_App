package gradocerrado.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Crear canal de notificaciones para Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            // Canal para recordatorios de estudio
            NotificationChannel studyChannel = new NotificationChannel(
                    "study_reminders",               // ID del canal (DEBE coincidir con backend)
                    "Recordatorios de Estudio",      // Nombre visible al usuario
                    NotificationManager.IMPORTANCE_HIGH
            );
            studyChannel.setDescription("Canal para recordatorios y notificaciones del estudio");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(studyChannel);
            }
        }
    }
}
