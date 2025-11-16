import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private router: Router,
    private platform: Platform,
    private pushNotificationService: PushNotificationService
  ) {
    this.initializeApp();
  }
  
  async initializeApp() {
    await this.platform.ready();

    console.log("🔥 App iniciada, inicializando notificaciones…");

    // Llamar SIEMPRE acá, apenas inicia la app
    await this.pushNotificationService.initPushNotifications();

    // ✅ Ya no redirigimos aquí, dejamos que el routing y cada página manejen la sesión
  }
}