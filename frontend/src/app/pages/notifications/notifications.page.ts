import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

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

  // Secciones expandibles
  expandedSections: { [key: string]: boolean } = {
    lastNotifications: true,  // Abierta por defecto
    notificationTypes: false,
    reminders: false,
    channels: false,
    advanced: false
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

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadNotifications();
    this.loadSettings();
  }

  // ========================================
  // SECCIONES EXPANDIBLES
  // ========================================
  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // ========================================
  // NOTIFICACIONES
  // ========================================
  loadNotifications() {
    this.notifications = [
      {
        id: 1,
        type: 'streak',
        icon: 'flame',
        iconColor: '#f59e0b',
        title: '¡Racha de 12 días!',
        message: 'Estás en una racha increíble. ¡No la pierdas!',
        time: 'Hace 2 horas',
        read: false,
        action: '/racha'
      },
      {
        id: 2,
        type: 'achievement',
        icon: 'trophy',
        iconColor: '#10b981',
        title: 'Logro desbloqueado',
        message: 'Has completado 10 sesiones de estudio',
        time: 'Hace 5 horas',
        read: false,
        action: '/racha'
      },
      {
        id: 3,
        type: 'reminder',
        icon: 'alarm',
        iconColor: '#3b82f6',
        title: 'Hora de estudiar',
        message: 'Tu sesión diaria de Derecho Civil te espera',
        time: 'Hace 1 día',
        read: true,
        action: '/civil'
      },
      {
        id: 4,
        type: 'goal',
        icon: 'checkmark-circle',
        iconColor: '#8b5cf6',
        title: 'Meta alcanzada',
        message: 'Has respondido 200 preguntas este mes',
        time: 'Hace 2 días',
        read: true,
        action: '/dashboard'
      },
      {
        id: 5,
        type: 'tip',
        icon: 'bulb',
        iconColor: '#f59e0b',
        title: 'Consejo del día',
        message: 'Estudiar en sesiones de 25 minutos mejora la retención',
        time: 'Hace 3 días',
        read: true,
        action: null
      }
    ];
    
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notification: any) {
    if (!notification.read) {
      notification.read = true;
      this.unreadCount--;
    }
    
    if (notification.action) {
      this.router.navigate([notification.action]);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
  }

  deleteNotification(notification: any, event: Event) {
    event.stopPropagation();
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
      if (!notification.read) {
        this.unreadCount--;
      }
    }
  }

  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
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
    console.log('Configuración guardada:', this.notificationSettings);
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
}