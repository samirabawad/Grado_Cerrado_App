// frontend/src/app/pages/notifications/notifications.page.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

// IMPORTAR EL SERVICIO DE PUSH
import { PushNotificationService } from '../../services/push-notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class NotificationsPage implements OnInit {

  notifications: any[] = [];
  unreadCount: number = 0;
  isLoading: boolean = true;

  // Secciones expandibles
  expandedSections: { [key: string]: boolean } = {
    lastNotifications: true,
    notificationTypes: false,
    reminders: false,
    channels: false,
    advanced: false
  };

  // Configuración de notificaciones (localStorage)
  notificationSettings = {
    masterSwitch: true,
    streakNotifications: true,
    achievementNotifications: true,
    studyReminders: true,
    tipsNotifications: true,
    goalNotifications: true,
    weeklyReport: true,
    motivationalMessages: true,
    dailyReminder: true,
    dailyReminderTime: '20:00',
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    doNotDisturbEnabled: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00'
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
    private pushService: PushNotificationService   // 👈 INYECTAMOS PUSH
  ) { }

  ngOnInit() {
    this.loadSettings();
    this.loadNotifications();

    // Si ya están activadas las push en ajustes → intentamos registrar
    this.ensurePushRegisteredIfNeeded();
  }

  ionViewWillEnter() {
    this.loadNotifications();
  }

  // ================================
  // 🔔 INICIALIZAR PUSH SI HACE FALTA
  // ================================
  private async ensurePushRegisteredIfNeeded() {
    try {
      if (this.notificationSettings.masterSwitch && this.notificationSettings.pushNotifications) {
        console.log('🔔 Notif. push activadas en ajustes → inicializando...');
        await this.pushService.initPushNotifications();
      } else {
        console.log('ℹ️ Push desactivadas; no se inicializa FCM');
      }
    } catch (err) {
      console.error('❌ Error inicializando push:', err);
    }
  }

  // Puedes llamar esto desde un botón "Probar en este dispositivo" si quieres
  async registerPushFromUI() {
    try {
      console.log('🧪 Usuario pidió probar notificaciones push');
      await this.pushService.initPushNotifications();
    } catch (err) {
      console.error('❌ Error registrando push desde UI:', err);
    }
  }

  // ========================================
  // CARGAR NOTIFICACIONES DESDE BACKEND
  // ========================================
  async loadNotifications() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.notifications = [];
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('📬 Cargando notificaciones para estudiante:', studentId);

      const response = await this.apiService.getNotifications(studentId).toPromise();
      
      if (response && response.success) {
        this.notifications = response.data.map((notif: any) => ({
          id: notif.id,
          type: this.getNotificationType(notif.titulo),
          icon: this.getNotificationIcon(notif.titulo),
          iconColor: this.getNotificationColor(notif.titulo),
          title: notif.titulo,
          message: notif.mensaje,
          time: this.formatNotificationTime(notif.fecha),
          read: notif.leido
        }));

        this.unreadCount = response.noLeidas || 0;
        
        console.log('✅ Notificaciones cargadas:', this.notifications.length);
        console.log('📊 No leídas:', this.unreadCount);
      }

    } catch (error) {
      console.error('❌ Error cargando notificaciones:', error);
      this.notifications = [];
    } finally {
      this.isLoading = false;
    }
  }

  // ========================================
  // HELPERS PARA MAPEAR NOTIFICACIONES
  // ========================================
  getNotificationType(titulo: string): string {
    if (titulo.toLowerCase().includes('racha')) return 'streak';
    if (titulo.toLowerCase().includes('logro') || titulo.toLowerCase().includes('meta')) return 'achievement';
    if (titulo.toLowerCase().includes('estudiar') || titulo.toLowerCase().includes('sesión')) return 'reminder';
    if (titulo.toLowerCase().includes('consejo')) return 'tip';
    return 'general';
  }

  getNotificationIcon(titulo: string): string {
    if (titulo.toLowerCase().includes('racha')) return 'flame';
    if (titulo.toLowerCase().includes('logro') || titulo.toLowerCase().includes('meta')) return 'trophy';
    if (titulo.toLowerCase().includes('estudiar') || titulo.toLowerCase().includes('sesión')) return 'alarm';
    if (titulo.toLowerCase().includes('consejo')) return 'bulb';
    return 'notifications';
  }

  getNotificationColor(titulo: string): string {
    if (titulo.toLowerCase().includes('racha')) return '#f59e0b';
    if (titulo.toLowerCase().includes('logro') || titulo.toLowerCase().includes('meta')) return '#10b981';
    if (titulo.toLowerCase().includes('estudiar') || titulo.toLowerCase().includes('sesión')) return '#3b82f6';
    if (titulo.toLowerCase().includes('consejo')) return '#8b5cf6';
    return '#64748b';
  }

  formatNotificationTime(fecha: string): string {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  // ========================================
  // ACCIONES DE NOTIFICACIONES
  // ========================================
  async markAsRead(notification: any) {
    if (notification.read) return;

    try {
      await this.apiService.markNotificationAsRead(notification.id).toPromise();
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      console.log('✅ Notificación marcada como leída');
    } catch (error) {
      console.error('❌ Error marcando notificación:', error);
    }
  }

  async markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    
    for (const notif of unreadNotifications) {
      try {
        await this.apiService.markNotificationAsRead(notif.id).toPromise();
        notif.read = true;
      } catch (error) {
        console.error('❌ Error marcando notificación:', error);
      }
    }
    
    this.unreadCount = 0;
    console.log('✅ Todas las notificaciones marcadas como leídas');
  }

  deleteNotification(notification: any, event: any) {
    event.stopPropagation();
    
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
      
      if (!notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    }
  }

  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
  }

  // ========================================
  // SECCIONES EXPANDIBLES
  // ========================================
  toggleSection(section: string) {
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      Object.keys(this.expandedSections).forEach(key => {
        if (['lastNotifications', 'notificationTypes', 'reminders', 'channels', 'advanced'].includes(key)) {
          this.expandedSections[key] = false;
        }
      });
      this.expandedSections[section] = true;
    }
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // ========================================
  // CONFIGURACIÓN (localStorage)
  // ========================================
  loadSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      this.notificationSettings = JSON.parse(saved);
    }
  }

  saveSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
    console.log('⚙️ Configuración guardada:', this.notificationSettings);
  }

  onSettingChange() {
    this.saveSettings();
    this.ensurePushRegisteredIfNeeded();
    
    // Actualizar hora en backend
    this.updateReminderTimeInBackend();
  }

  private updateReminderTimeInBackend() {
    const user = this.apiService.getCurrentUser();
    if (user?.id && this.notificationSettings.dailyReminder) {
      this.apiService.updateReminderTime(
        user.id,
        this.notificationSettings.dailyReminderTime
      ).subscribe({
        next: () => console.log('✅ Hora actualizada en backend'),
        error: (err) => console.error('❌ Error:', err)
      });
    }
  }

  onMasterSwitchChange() {
    if (!this.notificationSettings.masterSwitch) {
      this.notificationSettings.streakNotifications = false;
      this.notificationSettings.achievementNotifications = false;
      this.notificationSettings.studyReminders = false;
      this.notificationSettings.tipsNotifications = false;
      this.notificationSettings.goalNotifications = false;
      this.notificationSettings.weeklyReport = false;
      this.notificationSettings.motivationalMessages = false;
      this.notificationSettings.pushNotifications = false;
    }

    this.saveSettings();

    // Si se volvió a encender el master → registrar push si corresponde
    this.ensurePushRegisteredIfNeeded();
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================
  goBack() {
    this.router.navigate(['/home']);
  }
}
