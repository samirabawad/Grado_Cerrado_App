import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

interface Achievement {
  id: string;
  title: string;
  description: string;
  daysRequired: number;
  icon: string;
  unlocked: boolean;
  color: string;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasStudied: boolean;
  date: Date;
}

@Component({
  selector: 'app-racha',
  templateUrl: './racha.page.html',
  styleUrls: ['./racha.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class RachaPage implements OnInit {

  currentStreak: number = 0;
  bestStreak: number = 0;
  totalDays: number = 0;
  nextGoal: number = 0;

  calendarDays: CalendarDay[] = [];
  currentMonthName: string = '';
  studiedDates: Set<string> = new Set();

  achievements: Achievement[] = [
    { id: '1min', title: 'Primer Paso', description: 'Primera sesión completada', daysRequired: 0.0007, icon: 'footsteps', unlocked: false, color: '#10b981' },
    { id: '5min', title: 'Comenzando', description: 'Mantén la racha 5 minutos', daysRequired: 0.0035, icon: 'leaf', unlocked: false, color: '#10b981' },
    { id: '10min', title: 'Constante', description: 'Racha de 10 minutos', daysRequired: 0.007, icon: 'flash', unlocked: false, color: '#10b981' },
    { id: '1day', title: 'Primer Día', description: '1 día de racha', daysRequired: 1, icon: 'star', unlocked: false, color: '#10b981' },
    { id: '3days', title: 'Comenzando Fuerte', description: '3 días consecutivos', daysRequired: 3, icon: 'flame', unlocked: false, color: '#059669' },
    { id: '5days', title: 'Perseverante', description: '5 días de estudio', daysRequired: 5, icon: 'trophy', unlocked: false, color: '#047857' },
    { id: '7days', title: 'Una Semana', description: '7 días sin parar', daysRequired: 7, icon: 'ribbon', unlocked: false, color: '#065f46' },
    { id: '10days', title: 'Imparable', description: '10 días de racha', daysRequired: 10, icon: 'rocket', unlocked: false, color: '#064e3b' },
    { id: '15days', title: 'Dedicado', description: '15 días consecutivos', daysRequired: 15, icon: 'medal', unlocked: false, color: '#fbbf24' },
    { id: '21days', title: 'Hábito Formado', description: '21 días de constancia', daysRequired: 21, icon: 'checkmark-circle', unlocked: false, color: '#f59e0b' },
    { id: '30days', title: 'Un Mes Completo', description: '30 días sin fallar', daysRequired: 30, icon: 'star-half', unlocked: false, color: '#d97706' },
    { id: '60days', title: 'Maestro', description: '60 días de dedicación', daysRequired: 60, icon: 'school', unlocked: false, color: '#b45309' },
    { id: '100days', title: 'Leyenda', description: '100 días de racha', daysRequired: 100, icon: 'diamond', unlocked: false, color: '#92400e' }
  ];

  isLoading: boolean = true;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadStreakData();
  }

  async loadStreakData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando racha para estudiante:', studentId);

      try {
        const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();
        if (statsResponse && statsResponse.success) {
          const stats = statsResponse.data;
          this.currentStreak = stats.streak || 0;
          this.totalDays = stats.totalTests || 0;
          this.bestStreak = Math.max(this.currentStreak, this.totalDays);
          this.nextGoal = this.calculateNextGoal(this.currentStreak);
          this.unlockAchievements(this.currentStreak);
          
          console.log('Datos de racha cargados:', {
            current: this.currentStreak,
            best: this.bestStreak,
            total: this.totalDays,
            nextGoal: this.nextGoal
          });
        }

        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 100).toPromise();
        if (sessionsResponse && sessionsResponse.success && sessionsResponse.data) {
          sessionsResponse.data.forEach((session: any) => {
            const date = new Date(session.date);
            const dateStr = this.formatDateKey(date);
            this.studiedDates.add(dateStr);
          });
        }

        this.generateCalendar();

      } catch (error) {
        console.error('Error cargando datos de racha:', error);
      }

    } catch (error) {
      console.error('Error general en loadStreakData:', error);
    } finally {
      this.isLoading = false;
    }
  }

  generateCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.currentMonthName = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    this.calendarDays = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      this.calendarDays.push({
        day: 0,
        isCurrentMonth: false,
        isToday: false,
        hasStudied: false,
        date: new Date()
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDateKey(date);
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      this.calendarDays.push({
        day: day,
        isCurrentMonth: true,
        isToday: isToday,
        hasStudied: this.studiedDates.has(dateStr),
        date: date
      });
    }
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  unlockAchievements(streakDays: number) {
    this.achievements.forEach(achievement => {
      if (streakDays >= achievement.daysRequired) {
        achievement.unlocked = true;
      }
    });
  }

  calculateNextGoal(currentStreak: number): number {
    const goals = [1, 3, 5, 7, 10, 15, 21, 30, 60, 100];
    for (const goal of goals) {
      if (currentStreak < goal) {
        return goal;
      }
    }
    return currentStreak + 10;
  }

  getProgressToNextGoal(): number {
    if (this.nextGoal === 0) return 0;
    return (this.currentStreak / this.nextGoal) * 100;
  }

  getDaysToNextGoal(): number {
    return Math.max(0, this.nextGoal - this.currentStreak);
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  getTotalCount(): number {
    return this.achievements.length;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}