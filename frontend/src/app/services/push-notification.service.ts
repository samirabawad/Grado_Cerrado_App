import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}
  
  async initializePushNotifications(estudianteId: number): Promise<string | null> {
      try {
          console.log('🔔 Inicializando notificaciones push...');
          const platform = Capacitor.getPlatform();
          console.log('📱 Plataforma detectada:', platform);
          
          // SI ES WEB
          if (platform === 'web') {
            console.log('🌐 Modo navegador detectado - Usando token de prueba');
            
            const testToken = `TEST_WEB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log('🧪 Token fake generado:', testToken);
            
            await this.registerToken(estudianteId, testToken);
            console.log('✅ Token de prueba registrado en backend');
            
            return testToken;
          }

          // SI ES ANDROID O iOS
          console.log('📱 Modo dispositivo detectado - Solicitando permisos reales');
          console.log('🔔 Solicitando permisos de notificación...');
          const permission = await PushNotifications.requestPermissions();
          console.log('📊 Permisos resultado:', permission);

          if (permission.receive === 'denied') {
          console.warn('⚠️ Permisos denegados previamente');
          alert(
            'Las notificaciones están desactivadas.\n\n' +
            'Para activarlas:\n' +
            '1. Ve a Configuración\n' +
            '2. Apps > [Tu App]\n' + 
            '3. Permisos\n' +
            '4. Activa Notificaciones'
          );
          
          // Opcional: Abrir configuración de la app directamente
          // (requiere plugin adicional @capacitor/app)
          return null;
        }

          // 2. REGISTRAR PARA PUSH
          console.log('📝 Registrando para push notifications...'+estudianteId);
          await PushNotifications.register();
          console.log('✅ Registrado exitosamente'+estudianteId);

          // 3. CONFIGURAR LISTENERS
          this.setupNotificationListeners(estudianteId);

          // 4. OBTENER TOKEN (sin removeListener)
          return new Promise((resolve) => {
            let tokenReceived = false;

            // Listener para cuando llegue el token
            PushNotifications.addListener('registration', async (token) => {
              if (!tokenReceived) { // Para evitar múltiples llamadas
                tokenReceived = true;
                console.log('🎯 Token FCM recibido:', token.value, estudianteId);
                
                // Registrar en backend
                await this.registerToken(estudianteId, token.value);
                
                resolve(token.value);
              }
            });

            // Listener para errores
            PushNotifications.addListener('registrationError', (error) => {
              console.error('❌ Error obteniendo token:', error);
              if (!tokenReceived) {
                tokenReceived = true;
                resolve(null);
              }
            });

            // Timeout por si no llega el token
            setTimeout(() => {
              if (!tokenReceived) {
                console.warn('⏱️ Timeout esperando token');
                tokenReceived = true;
                resolve(null);
              }
            }, 10000);
          });

        } catch (error) {
            console.error('❌ Error inicializando notificaciones:', error);
            return null;
        }
    }




  private setupNotificationListeners(estudianteId: number) {
    // Notificación recibida con app en primer plano
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Notificación recibida (app abierta):', notification);
      
      // Mostrar alerta o toast
      alert(`${notification.title}: ${notification.body}`);
    });

    // Usuario tocó la notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👆 Notificación tocada:', action);
      
      // Navegar según los datos
      const data = action.notification.data;
      if (data && data.route) {
        // Navegar a ruta específica
        console.log('Navegando a:', data.route);
      }
    });
  }

  async sendWelcomeNotification(estudianteId: number) {
    try {
      const url = `${this.apiUrl}/Notificaciones/${estudianteId}/bienvenida`;
      console.log('🎉 Enviando notificación de bienvenida...');
      
      const response = await this.http.post(url, {}).toPromise();
      console.log('✅ Respuesta de notificación de bienvenida:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Error enviando notificación de bienvenida:', error);
      throw error;
    }
  }

  private async registerToken(estudianteId: number, token: string) {
    try {
      const url = `${this.apiUrl}/Notificaciones/registrar-token`;
      const body = { estudianteId, token };
      
      await this.http.post(url, body).toPromise();
      console.log('✅ Token registrado en backend');
    } catch (error) {
      console.error('❌ Error registrando token:', error);
    }
  }

  async sendTestNotification(estudianteId: number) {
    try {
      const url = `${this.apiUrl}/Notificaciones/${estudianteId}/test-push`;
      await this.http.post(url, {}).toPromise();
      console.log('✅ Notificación de prueba enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
    }
  }

  // NUEVO: Método para verificar estado
  async checkPermissionStatus() {
    const status = await PushNotifications.checkPermissions();
    console.log('📊 Estado actual de permisos:', status);
    return status;
  }
}