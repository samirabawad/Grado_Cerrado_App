import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class DashboardPage implements OnInit {

  userName: string = 'Estudiante';
  userLevel: string = 'Intermedio';
  userStreak: number = 0;

  totalSessions: number = 0;
  totalQuestions: number = 0;
  totalCorrectAnswers: number = 0;
  overallSuccessRate: number = 0;
  currentGoal: number = 200;
  currentSessionGoal: number = 50;

  chartData: any[] = [];
  areaStats: any[] = [];
  recentSessions: any[] = [];
  subtemaStats: any[] = [];
  
  isLoading: boolean = true;
  selectedTimeFrame: string = 'week';
  expandedArea: string | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading = true;
    
    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.error('No hay usuario logueado');
        this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;
      const fullName = currentUser.name || 'Estudiante';
      this.userName = fullName.split(' ')[0]; // Solo el primer nombre
      
      console.log('Cargando dashboard para estudiante:', studentId);

      try {
        const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();
        if (statsResponse && statsResponse.success) {
          const stats = statsResponse.data;
          this.totalSessions = stats.totalTests || 0;
          this.totalQuestions = stats.totalQuestions || 0;
          this.totalCorrectAnswers = stats.correctAnswers || 0;
          this.overallSuccessRate = Math.round(stats.successRate || 0);
          this.userStreak = stats.streak || 0;
          
          console.log('Estadísticas cargadas:', stats);
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }

      try {
        const areaResponse = await this.apiService.getAreaStats(studentId).toPromise();
        if (areaResponse && areaResponse.success) {
          this.areaStats = areaResponse.data.map((area: any) => ({
            area: area.area,
            sessions: area.sessions,
            totalQuestions: area.totalQuestions,
            correctAnswers: area.correctAnswers,
            successRate: Math.round(area.successRate || 0),
            color: area.color
          }));
          
          console.log('Estadísticas por área:', this.areaStats);
        }
      } catch (error) {
        console.error('Error cargando estadísticas por área:', error);
      }

      try {
        const subtemaResponse = await this.apiService.getSubtemaStats(studentId).toPromise();
        if (subtemaResponse && subtemaResponse.success) {
          this.subtemaStats = subtemaResponse.data;
          console.log('Estadísticas por subtema:', this.subtemaStats);
        }
      } catch (error) {
        console.error('Error cargando estadísticas por subtema:', error);
      }

      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 5).toPromise();
        if (sessionsResponse && sessionsResponse.success) {
          this.recentSessions = sessionsResponse.data;
          console.log('Sesiones recientes:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
      }

      await this.generateChartData();

      this.currentGoal = this.calculateProgressiveGoal(this.totalQuestions);
      this.currentSessionGoal = this.calculateSessionGoal(this.totalSessions);

    } catch (error) {
      console.error('Error general en loadDashboardData:', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleAreaExpansion(areaName: string) {
    if (this.expandedArea === areaName) {
      this.expandedArea = null;
    } else {
      this.expandedArea = areaName;
    }
  }

  isAreaExpanded(areaName: string): boolean {
    return this.expandedArea === areaName;
  }

  getSubtemasForArea(areaName: string): any[] {
    if (!this.subtemaStats || this.subtemaStats.length === 0) {
      return [];
    }
    return this.subtemaStats.filter(s => 
      s.temaNombre === areaName || 
      s.temaNombre === areaName.replace('Derecho ', '')
    );
  }

  getWeakSubtemas(areaName: string): any[] {
    const subtemas = this.getSubtemasForArea(areaName);
    if (!subtemas || subtemas.length === 0) {
      return [];
    }
    return subtemas.filter(s => s.successRate < 60).slice(0, 2);
  }

  getProgressMessage(): string {
    if (this.totalSessions === 0) {
      return 'Comienza tu primera sesión';
    } else if (this.totalSessions < 10) {
      return '¡Sigue así!';
    } else if (this.totalSessions < 50) {
      return '¡Excelente progreso!';
    } else {
      return '¡Eres imparable!';
    }
  }

  async generateChartData() {
    const currentUser = this.apiService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      this.chartData = daysOfWeek.map(day => ({
        date: day,
        civil: 0,
        procesal: 0,
        total: 0
      }));
      return;
    }

    try {
      const response = await this.apiService.getWeeklyProgress(currentUser.id).toPromise();
      if (response && response.success && response.data) {
        this.chartData = response.data;
        console.log('Datos del gráfico cargados:', this.chartData);
      }
    } catch (error) {
      console.error('Error cargando gráfico semanal:', error);
      const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      this.chartData = daysOfWeek.map(day => ({
        date: day,
        civil: 0,
        procesal: 0,
        total: 0
      }));
    }
  }

  changeTimeFrame(timeFrame: string) {
    this.selectedTimeFrame = timeFrame;
    this.loadDashboardData();
  }

  goToSession(sessionId: number) {
    console.log('Navegar a sesión:', sessionId);
  }

  goToAreaDetails(area: string) {
    console.log('Ver detalles de:', area);
  }

  startNewSession() {
    this.router.navigate(['/home']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  }

  getMaxValue(): number {
    if (!this.chartData || this.chartData.length === 0) return 20;
    const maxTotal = Math.max(...this.chartData.map(d => d.total));
    return maxTotal === 0 ? 20 : maxTotal + 2;
  }

  getBarHeight(value: number, type: 'civil' | 'procesal'): number {
    const maxValue = this.getMaxValue();
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  getDonutOffset(): number {
    const circumference = 219.8;
    if (this.totalQuestions === 0) {
      return circumference;
    }
    const progress = Math.min(this.totalQuestions / this.currentGoal, 1);
    return circumference * (1 - progress);
  }

  getGaugeOffset(): number {
    const maxDash = 157;
    const progress = Math.min(this.overallSuccessRate / 100, 1);
    return maxDash * (1 - progress);
  }

  getGaugeOffsetLarge(): number {
    const maxDash = 125.6;
    if (this.overallSuccessRate === 0) {
      return maxDash;
    }
    const progress = Math.min(this.overallSuccessRate / 100, 1);
    return maxDash * (1 - progress);
  }

  calculateSessionGoal(sessions: number): number {
    if (sessions < 50) return 50;
    if (sessions < 100) return 100;
    if (sessions < 150) return 150;
    if (sessions < 200) return 200;
    if (sessions < 250) return 250;
    
    return Math.ceil(sessions / 50) * 50;
  }

  calculateProgressiveGoal(questions: number): number {
    if (questions < 200) return 200;
    if (questions < 250) return 250;
    if (questions < 300) return 300;
    if (questions < 350) return 350;
    if (questions < 400) return 400;
    if (questions < 450) return 450;
    if (questions < 500) return 500;
    
    return Math.ceil(questions / 50) * 50;
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  }
}