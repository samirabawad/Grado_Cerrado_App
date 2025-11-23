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
  isLoading: boolean = true;

  calendarDays: CalendarDay[] = [];
  currentMonthName: string = '';
  studiedDates: Set<string> = new Set();
  currentDisplayYear: number;
  currentDisplayMonth: number;
  isCurrentMonth: boolean = true;
  oldestYear: number;
  oldestMonth: number;

  achievements: Achievement[] = [
    { id: '1day', title: 'Primer Día', description: '1 día de racha', daysRequired: 1, icon: 'star', unlocked: false, color: '#34d399' },
    { id: '3days', title: 'Comenzando Fuerte', description: '3 días consecutivos', daysRequired: 3, icon: 'flame', unlocked: false, color: '#6ee7b7' },
    { id: '5days', title: 'Perseverante', description: '5 días de estudio', daysRequired: 5, icon: 'trophy', unlocked: false, color: '#a7f3d0' },
    { id: '7days', title: 'Una Semana', description: '7 días sin parar', daysRequired: 7, icon: 'ribbon', unlocked: false, color: '#34d399' },
    { id: '10days', title: 'Imparable', description: '10 días de racha', daysRequired: 10, icon: 'rocket', unlocked: false, color: '#6ee7b7' },
    { id: '15days', title: 'Dedicado', description: '15 días consecutivos', daysRequired: 15, icon: 'medal', unlocked: false, color: '#a7f3d0' },
    { id: '21days', title: 'Hábito Formado', description: '21 días de constancia', daysRequired: 21, icon: 'checkmark-circle', unlocked: false, color: '#34d399' },
    { id: '30days', title: 'Un Mes Completo', description: '30 días sin fallar', daysRequired: 30, icon: 'star-half', unlocked: false, color: '#6ee7b7' },
    { id: '60days', title: 'Maestro', description: '60 días de dedicación', daysRequired: 60, icon: 'school', unlocked: false, color: '#a7f3d0' },
    { id: '100days', title: 'Leyenda', description: '100 días de racha', daysRequired: 100, icon: 'diamond', unlocked: false, color: '#34d399' }
  ];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    const today = new Date();
    this.currentDisplayYear = today.getFullYear();
    this.currentDisplayMonth = today.getMonth();
    this.oldestYear = today.getFullYear();
    this.oldestMonth = today.getMonth();
  }

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
          this.unlockAchievements(this.currentStreak);
          console.log('Datos de racha cargados:', { current: this.currentStreak });
        }

const sessionsResponse = await this.apiService.getRecentSessions(studentId, 250).toPromise();
        if (sessionsResponse && sessionsResponse.success && sessionsResponse.data && sessionsResponse.data.length > 0) {
          const dates: Date[] = [];
          
          sessionsResponse.data.forEach((session: any) => {
            const utcDate = new Date(session.date);
            const chileDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
            const dateStr = this.formatDateKey(chileDate);
            this.studiedDates.add(dateStr);
            dates.push(chileDate);
          });
          
          // Encontrar la fecha más antigua
          if (dates.length > 0) {
            const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
            this.oldestYear = oldestDate.getFullYear();
            this.oldestMonth = oldestDate.getMonth();
          }
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

  unlockAchievements(streak: number) {
    this.achievements.forEach(achievement => {
      achievement.unlocked = streak >= achievement.daysRequired;
    });
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

generateCalendar() {
    const today = new Date();
    const year = this.currentDisplayYear;
    const month = this.currentDisplayMonth;
    
    this.isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.currentMonthName = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();

    this.calendarDays = [];

    // Días del mes anterior
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, 0 - (firstDayOfWeek - i - 1));
      this.calendarDays.push({
        day: prevMonthDay.getDate(),
        isCurrentMonth: false,
        isToday: false,
        hasStudied: false,
        date: prevMonthDay
      });
    }

    // Días del mes actual
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = this.formatDateKey(currentDate);
      
      this.calendarDays.push({
        day: day,
        isCurrentMonth: true,
        isToday: this.isToday(currentDate),
        hasStudied: this.studiedDates.has(dateString),
        date: currentDate
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
navigateMonth(direction: number) {
    const newMonth = this.currentDisplayMonth + direction;
    const newYear = newMonth > 11 ? this.currentDisplayYear + 1 : 
                    newMonth < 0 ? this.currentDisplayYear - 1 : 
                    this.currentDisplayYear;
    const adjustedMonth = newMonth > 11 ? 0 : newMonth < 0 ? 11 : newMonth;
    
    // Verificar si la nueva fecha está dentro del rango permitido
    if (!this.canNavigateToMonth(newYear, adjustedMonth)) {
      return;
    }
    
    this.currentDisplayMonth = adjustedMonth;
    this.currentDisplayYear = newYear;
    this.generateCalendar();
  }

  canNavigateToMonth(year: number, month: number): boolean {
    const targetDate = new Date(year, month);
    const oldestDate = new Date(this.oldestYear, this.oldestMonth);
    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth());
    
    return targetDate >= oldestDate && targetDate <= currentDate;
  }

  canNavigateBack(): boolean {
    return this.canNavigateToMonth(
      this.currentDisplayMonth === 0 ? this.currentDisplayYear - 1 : this.currentDisplayYear,
      this.currentDisplayMonth === 0 ? 11 : this.currentDisplayMonth - 1
    );
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
