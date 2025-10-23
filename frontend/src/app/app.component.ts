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
  constructor(private router: Router,
    private platform: Platform,
    private pushService: PushNotificationService
  ) {
        this.initializeApp();
  }
  async initializeApp() {
    await this.platform.ready();
    
    // Verificar sesión
    this.checkSession();
    
    // Si hay usuario logueado, inicializar notificaciones
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      console.log('👤 Usuario encontrado, inicializando notificaciones...');
      await this.pushService.initializePushNotifications(user.id);
    }
  }

  checkSession() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/welcome']);
    }
  }
}