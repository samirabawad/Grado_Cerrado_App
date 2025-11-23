import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  private tokenRegistered = false; // 👈 Evitar duplicados

  constructor(private http: HttpClient) {}

  async initPushNotifications() {
    console.log("🚀 Iniciando servicio de notificaciones…");

    // 1️⃣ Verificar permisos
    let permStatus = await PushNotifications.checkPermissions();
    console.log("🔎 Permiso inicial:", permStatus);

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
      console.log("🔎 Permiso luego de solicitud:", permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.warn("❌ Notificaciones bloqueadas. No se puede continuar.");
      return;
    }

    // 2️⃣ Registrar el dispositivo en FCM
    await PushNotifications.register();

    // 3️⃣ Token recibido
    PushNotifications.addListener('registration', token => {
      console.log("📲 Token del dispositivo:", token.value);
      if (!this.tokenRegistered) {
        this.sendTokenToBackend(token.value);
        this.tokenRegistered = true;
      }
    });

    // 4️⃣ Error de registro
    PushNotifications.addListener('registrationError', err => {
      console.error("❌ Error en registro de push:", err);
    });

    // 5️⃣ Notificación recibida en foreground
    PushNotifications.addListener('pushNotificationReceived', notif => {
      console.log("📩 Notificación recibida:", notif);
      // TODO: Mostrar notificación local o actualizar lista
    });

    // 6️⃣ Notificación tocada
    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      console.log("👉 Notificación tocada:", action);
      // TODO: Navegar según tipo de notificación
      const data = action.notification.data;
      if (data?.type === 'welcome') {
        // Navegar a home, etc.
      }
    });
  }

  private sendTokenToBackend(token: string) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
      console.warn('⚠️ No hay usuario logueado, no se puede registrar token');
      return;
    }

    const user = JSON.parse(currentUser);

    // ✅ URL CORREGIDA (sin mayúscula, sin guión)
    this.http.post(`${environment.apiUrl}/notificaciones/registrar-token`, {
      estudianteId: user.id,
      token: token
    }).subscribe({
      next: (response) => {
        console.log('✅ Token registrado en backend:', response);
      },
      error: (err) => {
        console.error('❌ Error enviando token:', err);
        console.error('Detalles:', err.error);
      }
    });
  }
}