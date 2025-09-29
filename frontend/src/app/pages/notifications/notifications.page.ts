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

  // Vista actual: 'list' o 'settings'
  currentView: string = 'list';
  
  // Notificaciones
  notifications: any[] = [];
  unreadCount: number = 0;
  
  // Configuración de recordatorios
  reminderSettings = {
    dailyReminder: true,
    dailyReminderTime: '20:00',
    streakReminder: true,
    achievementAlerts: true,
    studyGoalReminder: true,
    weeklyReport: true,
    pushNotifications: true,
    emailNotifications: false
  };

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadNotifications();
    this.loadSettings();
  }

  // Cargar notificaciones
  loadNotifications() {
    // Datos de ejemplo (después conectar con API)
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

  // Cargar configuración
  loadSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      this.reminderSettings = JSON.parse(saved);
    }
  }

  // Guardar configuración
  saveSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(this.reminderSettings));
    console.log('Configuración guardada:', this.reminderSettings);
  }

  // Cambiar vista
  switchView(view: string) {
    this.currentView = view;
  }

  // Marcar notificación como leída
  markAsRead(notification: any) {
    if (!notification.read) {
      notification.read = true;
      this.unreadCount--;
    }
    
    // Si tiene acción, navegar
    if (notification.action) {
      this.router.navigate([notification.action]);
    }
  }

  // Marcar todas como leídas
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
  }

  // Eliminar notificación
  deleteNotification(notification: any, event: Event) {
    event.stopPropagation(); // Evitar que se ejecute markAsRead
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
      if (!notification.read) {
        this.unreadCount--;
      }
    }
  }

  // Limpiar todas las notificaciones
  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
  }

  // Volver
  goBack() {
    this.router.navigate(['/home']);
  }

  // Método para actualizar configuración (se llama automáticamente con ngModel)
  onSettingChange() {
    this.saveSettings();
  }
}