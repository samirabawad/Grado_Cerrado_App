import { Injectable } from '@angular/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  private apiUrl = environment.apiUrl; // Ya incluye /api

  constructor(private http: HttpClient) {}

  async initializePushNotifications(estudianteId: number) {
    try {
      console.log('🔔 Inicializando notificaciones push...');

      // 1. Solicitar permisos
      const permission = await FirebaseMessaging.requestPermissions();
      console.log('✅ Permisos:', permission.receive);

      if (permission.receive === 'granted') {
        // 2. Obtener token FCM
        const result = await FirebaseMessaging.getToken();
        const token = result.token;
        console.log('🎯 Token FCM obtenido:', token);

        // 3. Registrar token en backend
        await this.registerToken(estudianteId, token);

        // 4. Escuchar notificaciones
        this.setupNotificationListeners();
      }

    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
    }
  }

  private async registerToken(estudianteId: number, token: string) {
    try {
      const url = `${this.apiUrl}/Notificaciones/registrar-token`;  // 👈 SIN /api/ porque ya está en environment
      const body = { estudianteId, token };
      
      await this.http.post(url, body).toPromise();
      console.log('✅ Token registrado en backend');
    } catch (error) {
      console.error('❌ Error registrando token:', error);
    }
  }

  private setupNotificationListeners() {
    // Escuchar notificaciones cuando la app está en primer plano
    FirebaseMessaging.addListener('notificationReceived', (notification) => {
      console.log('📬 Notificación recibida:', notification);
    });

    // Escuchar cuando el usuario toca una notificación
    FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      console.log('👆 Notificación tocada:', action);
    });
  }

  async sendTestNotification(estudianteId: number) {
    try {
      const url = `${this.apiUrl}/Notificaciones/${estudianteId}/test-push`;  // 👈 SIN /api/ porque ya está en environment
      await this.http.post(url, {}).toPromise();
      console.log('✅ Notificación de prueba enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
    }
  }
}