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
  currentSessionGoal: number = 50; // ✅ AGREGADO

  chartData: any[] = [];
  areaStats: any[] = [];
  recentSessions: any[] = [];
  
  isLoading: boolean = true;
  selectedTimeFrame: string = 'week';

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  // ✅ MÉTODO PRINCIPAL - USA ESTUDIANTE_ID 4
  async loadDashboardData() {
    this.isLoading = true;
    
    try {
      const studentId = 4;
      this.userName = 'Estudiante 00000000';

      // 📊 CARGAR ESTADÍSTICAS GENERALES
      try {
        const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();
        if (statsResponse && statsResponse.success) {
          const stats = statsResponse.data;
          this.totalSessions = stats.totalTests || 0;
          this.totalQuestions = stats.totalQuestions || 0;
          this.totalCorrectAnswers = stats.correctAnswers || 0;
          this.overallSuccessRate = Math.round(stats.successRate || 0);
          this.userStreak = stats.streak || 0;
          this.currentGoal = this.calculateProgressiveGoal(this.totalQuestions);
          this.currentSessionGoal = this.calculateSessionGoal(this.totalSessions); // ✅ CALCULAR OBJETIVO
          
          console.log('✅ Estadísticas cargadas:', {
            sesiones: this.totalSessions,
            preguntas: this.totalQuestions,
            correctas: this.totalCorrectAnswers,
            precision: this.overallSuccessRate
          });
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }

      // 📈 CARGAR ESTADÍSTICAS POR ÁREA
      try {
        const areaResponse = await this.apiService.getAreaStats(studentId).toPromise();
        if (areaResponse && areaResponse.success) {
          const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
          
          this.areaStats = areaResponse.data.map((area: any, index: number) => ({
            area: area.area,
            totalQuestions: area.totalQuestions,
            correctAnswers: area.correctAnswers,
            successRate: Math.round(area.successRate),
            color: colors[index % colors.length],
            sessions: area.sessions
          }));
          
          console.log('✅ Áreas cargadas:', this.areaStats);
        }
      } catch (error) {
        console.error('Error cargando áreas:', error);
      }

      // 📅 CARGAR SESIONES RECIENTES
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 5).toPromise();
        if (sessionsResponse && sessionsResponse.success) {
          this.recentSessions = sessionsResponse.data.map((session: any) => ({
            id: session.id,
            date: this.formatDate(session.date),
            area: session.area,
            duration: session.duration,
            questions: session.questions,
            correct: session.correct,
            successRate: Math.round(session.successRate)
          }));
          
          console.log('✅ Sesiones cargadas:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones:', error);
      }

      this.generateChartData();

    } catch (error) {
      console.error('Error general:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // ✅ GENERAR BADGES DE SESIONES DINÁMICAMENTE
  getSessionBadges(): number[] {
    const maxBadges = 5;
    return Array(maxBadges).fill(0).map((_, i) => i);
  }

  generateChartData() {
    const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    this.chartData = daysOfWeek.map(day => {
      const dailyQuestions = Math.floor(Math.random() * 15) + 5;
      const civilQuestions = Math.floor(dailyQuestions * 0.6);
      const procesalQuestions = dailyQuestions - civilQuestions;
      
      return {
        date: day,
        civil: civilQuestions,
        procesal: procesalQuestions,
        total: dailyQuestions
      };
    });
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
    return Math.max(...this.chartData.map(d => d.total)) + 2;
  }

  getBarHeight(value: number, type: 'civil' | 'procesal'): number {
    const maxValue = this.getMaxValue();
    return (value / maxValue) * 100;
  }

  getDonutOffset(): number {
    const circumference = 219.8;
    const progress = Math.min(this.totalQuestions / this.currentGoal, 1);
    return circumference * (1 - progress);
  }

  getGaugeOffset(): number {
    const maxDash = 110;
    const progress = Math.min(this.overallSuccessRate / 100, 1);
    return maxDash * (1 - progress);
  }

  // ✅ CALCULAR OBJETIVO DE SESIONES (cada 50)
  calculateSessionGoal(sessions: number): number {
    if (sessions < 50) return 50;
    if (sessions < 100) return 100;
    if (sessions < 150) return 150;
    if (sessions < 200) return 200;
    if (sessions < 250) return 250;
    
    return Math.ceil(sessions / 50) * 50;
  }

  // ✅ GAUGE OFFSET PARA GRÁFICO GRANDE
  getGaugeOffsetLarge(): number {
    const maxDash = 125.6;
    const progress = Math.min(this.overallSuccessRate / 100, 1);
    return maxDash * (1 - progress);
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