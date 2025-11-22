import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

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
    settings: false,
    notificationTypes: false,
    reminders: false,
    channels: false
  };

  // Configuración de notificaciones
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

  // Selectores de hora para recordatorios
  hours: string[] = [];
  minutes: string[] = [];
  reminderHour: string = '20';
  reminderMinute: string = '00';

  // Selectores de hora para "No molestar"
  dndStartHour: string = '22';
  dndStartMinute: string = '00';
  dndEndHour: string = '08';
  dndEndMinute: string = '00';


  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadNotifications();
    this.loadSettings();
    this.initializeTimeSelectors();
  }

  ionViewWillEnter() {
    this.loadNotifications();
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
        // Mapear notificaciones del backend al formato del frontend
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
    // ✅ Convertir fecha UTC del servidor a hora chilena
    const date = new Date(fecha);
    
    // Chile está en UTC-3 (horario estándar) o UTC-4 (horario de verano)
    // Usamos Intl para manejar automáticamente el cambio de horario
    const chileDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    
    const diffMs = now.getTime() - chileDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    // Formatear fecha en español de Chile
    return chileDate.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'America/Santiago'
    });
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
    // Si la sección ya está abierta, la cerramos
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      // Cerrar todas las secciones principales
      Object.keys(this.expandedSections).forEach(key => {
        // Solo cerrar secciones principales
        if (['lastNotifications', 'notificationTypes', 'reminders', 'channels', 'advanced'].includes(key)) {
          this.expandedSections[key] = false;
        }
      });
      // Abrir la sección clickeada
      this.expandedSections[section] = true;
    }
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // ========================================
  // CONFIGURACIÓN
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
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================
  goBack() {
    this.router.navigate(['/home']);
  }
  // ========================================
  // SELECTOR DE HORA
  // ========================================
  showHourPicker: boolean = false;
  availableHours: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  showReminderDropdown = false;
  showDndStartDropdown = false;
  showDndEndDropdown = false;

  toggleHourPicker() {
    this.showHourPicker = !this.showHourPicker;
  }

  getFormattedHour(): string {
    const time = this.notificationSettings.dailyReminderTime;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  isHourSelected(hour: string): boolean {
    return this.getFormattedHour() === hour;
  }

  selectHour(hour: string) {
    const [time, period] = hour.split(' ');
    const hourNum = parseInt(time.split(':')[0]);
    let hour24 = hourNum;
    
    if (period === 'PM' && hourNum !== 12) {
      hour24 = hourNum + 12;
    } else if (period === 'AM' && hourNum === 12) {
      hour24 = 0;
    }
    
    this.notificationSettings.dailyReminderTime = `${hour24.toString().padStart(2, '0')}:00`;
    this.showHourPicker = false;
    this.onSettingChange();
  }
  
  // ========================================
// INICIALIZAR SELECTORES DE HORA
// ========================================
initializeTimeSelectors() {
  // Generar horas (00-23)
  for (let i = 0; i < 24; i++) {
    this.hours.push(i.toString().padStart(2, '0'));
  }
  
  // Generar minutos (00, 15, 30, 45)
  this.minutes = ['00', '15', '30', '45'];
  
  // Inicializar desde los valores guardados
  if (this.notificationSettings.dailyReminderTime) {
    const [h, m] = this.notificationSettings.dailyReminderTime.split(':');
    this.reminderHour = h;
    this.reminderMinute = m;
  }
  
  if (this.notificationSettings.doNotDisturbStart) {
    const [h, m] = this.notificationSettings.doNotDisturbStart.split(':');
    this.dndStartHour = h;
    this.dndStartMinute = m;
  }
  
  if (this.notificationSettings.doNotDisturbEnd) {
    const [h, m] = this.notificationSettings.doNotDisturbEnd.split(':');
    this.dndEndHour = h;
    this.dndEndMinute = m;
  }
}

// ========================================
// ACTUALIZAR HORA DE RECORDATORIO
// ========================================
  updateReminderTime() {
    this.notificationSettings.dailyReminderTime = `${this.reminderHour}:${this.reminderMinute}`;
    this.onSettingChange();
  }

  // ========================================
  // ACTUALIZAR HORA DE INICIO NO MOLESTAR
  // ========================================
  updateDndStartTime() {
    this.notificationSettings.doNotDisturbStart = `${this.dndStartHour}:${this.dndStartMinute}`;
    this.onSettingChange();
  }

  // ========================================
  // ACTUALIZAR HORA DE FIN NO MOLESTAR
  // ========================================
  updateDndEndTime() {
    this.notificationSettings.doNotDisturbEnd = `${this.dndEndHour}:${this.dndEndMinute}`;
    this.onSettingChange();
  }

  toggleReminderDropdown() {
    this.showReminderDropdown = !this.showReminderDropdown;
    this.showDndStartDropdown = false;
    this.showDndEndDropdown = false;
  }

  toggleDndStartDropdown() {
    this.showDndStartDropdown = !this.showDndStartDropdown;
    this.showReminderDropdown = false;
    this.showDndEndDropdown = false;
  }

  toggleDndEndDropdown() {
    this.showDndEndDropdown = !this.showDndEndDropdown;
    this.showReminderDropdown = false;
    this.showDndStartDropdown = false;
  }

  selectReminderHour(hour: string) {
    this.notificationSettings.dailyReminderTime = hour;
    this.showReminderDropdown = false;
    this.onSettingChange();
  }

  selectDndStartHour(hour: string) {
    this.notificationSettings.doNotDisturbStart = hour;
    this.showDndStartDropdown = false;
    this.onSettingChange();
  }

  selectDndEndHour(hour: string) {
    this.notificationSettings.doNotDisturbEnd = hour;
    this.showDndEndDropdown = false;
    this.onSettingChange();
  }

}