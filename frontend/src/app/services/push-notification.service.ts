import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  constructor(private http: HttpClient) {}

  async initPushNotifications() {
    console.log("🚀 Iniciando servicio de notificaciones…");

    // 1️⃣ Verificar permisos en Android 13+
    let permStatus = await PushNotifications.checkPermissions();
    console.log("🔎 Permiso inicial:", permStatus);

    // Android 13 usa "display" en lugar de "receive"
    if (permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
      console.log("🔎 Permiso luego de solicitud:", permStatus);
    }

    // Si no se otorgaron permisos → cortar
    if (permStatus.receive === 'granted') {
      console.warn("❌ Notificaciones bloqueadas. No se puede continuar.");
      return;
    }

    // 2️⃣ Registrar el dispositivo en FCM
    await PushNotifications.register();

    // 3️⃣ Token recibido correctamente
    PushNotifications.addListener('registration', token => {
      console.log("📲 Token del dispositivo:", token.value);
      this.sendTokenToBackend(token.value);
    });

    // 4️⃣ Manejo de errores de registro
    PushNotifications.addListener('registrationError', err => {
      console.error("❌ Error en registro de push:", err);
    });

    // 5️⃣ Notificación recibida en foreground
    PushNotifications.addListener('pushNotificationReceived', notif => {
      console.log("📩 Notificación recibida:", notif);
    });

    // 6️⃣ Notificación tocada por el usuario
    PushNotifications.addListener('pushNotificationActionPerformed', notif => {
      console.log("👉 Notificación tocada:", notif);
    });
  }

  private sendTokenToBackend(token: string) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
      console.log('No hay usuario logueado');
      return;
    }

    const user = JSON.parse(currentUser);

    this.http.post(`${environment.apiUrl}/Notificaciones/registrar-token`, {
      estudianteId: user.id,
      token: token
    }).subscribe({
      next: () => console.log('✅ Token enviado al backend'),
      error: (err) => console.error('❌ Error enviando token:', err)
    });
  }
}
