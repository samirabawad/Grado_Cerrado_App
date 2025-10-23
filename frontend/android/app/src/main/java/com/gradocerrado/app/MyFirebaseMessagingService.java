package com.gradocerrado.app;

import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🎯 NUEVO TOKEN FCM GENERADO: " + token);
        Log.d(TAG, "📏 Longitud del token: " + token.length());
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "📬 Mensaje recibido de: " + remoteMessage.getFrom());
    }
}