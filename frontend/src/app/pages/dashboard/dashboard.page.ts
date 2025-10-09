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
  
  isLoading: boolean = true;
  selectedTimeFrame: string = 'week';
  expandedArea: string | null = null;
  expandedTema: string | null = null;

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
      this.userName = fullName.split(' ')[0];
      
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
        const areaResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();        
        if (areaResponse && areaResponse.success) {
          console.log('Datos jerárquicos:', areaResponse.data);
          
          this.areaStats = [];
          
          areaResponse.data.forEach((item: any) => {
            if (item.type === 'general') {
              this.areaStats.push({
                area: item.area,
                sessions: item.sessions,
                totalQuestions: item.totalQuestions,
                correctAnswers: item.correctAnswers,
                successRate: Math.round(item.successRate || 0),
                isGeneral: true,
                colorBarra: 'verde',
                temas: []
              });
            } else if (item.type === 'area') {
              // Procesar temas con nueva lógica
              const temasConNuevoCalculo = item.temas.map((tema: any) => {
                const subtemasConPorcentaje = tema.subtemas.map((subtema: any) => ({
                  subtemaId: subtema.subtemaId,
                  subtemaNombre: subtema.subtemaNombre,
                  totalPreguntas: subtema.totalPreguntas,
                  preguntasCorrectas: subtema.preguntasCorrectas,
                  porcentajeAcierto: this.calculateSubtemaSuccessRate(subtema.preguntasCorrectas)
                }));

                const porcentajeTema = this.calculateTemaSuccessRate(subtemasConPorcentaje);

                return {
                  temaId: tema.temaId,
                  temaNombre: tema.temaNombre,
                  totalPreguntas: tema.totalPreguntas,
                  preguntasCorrectas: tema.preguntasCorrectas,
                  porcentajeAcierto: porcentajeTema,
                  subtemas: subtemasConPorcentaje
                };
              });

              const totalCorrectas = temasConNuevoCalculo.reduce((sum: number, tema: any) => 
                sum + tema.preguntasCorrectas, 0);
              const totalPreguntas = temasConNuevoCalculo.reduce((sum: number, tema: any) => 
                sum + tema.totalPreguntas, 0);
              const porcentajeArea = temasConNuevoCalculo.length > 0 
                ? Math.round(temasConNuevoCalculo.reduce((sum: number, tema: any) => 
                    sum + tema.porcentajeAcierto, 0) / temasConNuevoCalculo.length)
                : 0;
              
              this.areaStats.push({
                area: item.area,
                sessions: 0,
                totalQuestions: totalPreguntas,
                correctAnswers: totalCorrectas,
                successRate: porcentajeArea,
                isGeneral: false,
                colorBarra: 'naranja',
                temas: temasConNuevoCalculo
              });
            }
          });

          // AGREGAR Derecho Procesal (placeholder sin datos)
          this.areaStats.push({
            area: 'Derecho Procesal',
            sessions: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            successRate: 0,
            isGeneral: false,
            colorBarra: 'azul',
            temas: []
          });
          
          console.log('Estadísticas procesadas con nueva lógica:', this.areaStats);
        }
      } catch (error) {
        console.error('Error cargando estadísticas por área:', error);
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

  calculateAreaSuccessRate(temas: any[]): number {
    if (!temas || temas.length === 0) return 0;
    
    // El porcentaje del área es el promedio de los porcentajes de sus temas
    const totalPorcentaje = temas.reduce((sum: number, tema: any) => {
      return sum + tema.porcentajeAcierto;
    }, 0);
    
    return Math.round(totalPorcentaje / temas.length);
  }

  // NUEVO: Calcular porcentaje de un tema basado en sus subtemas
  calculateTemaSuccessRate(subtemas: any[]): number {
    if (!subtemas || subtemas.length === 0) return 0;
    
    // El porcentaje del tema es el promedio de los porcentajes de sus subtemas
    const totalPorcentaje = subtemas.reduce((sum: number, subtema: any) => {
      return sum + this.calculateSubtemaSuccessRate(subtema.preguntasCorrectas);
    }, 0);
    
    return Math.round(totalPorcentaje / subtemas.length);
  }

  // NUEVO: Calcular porcentaje de un subtema (máximo 100 correctas = 100%)
  calculateSubtemaSuccessRate(correctas: number): number {
    const MAX_CORRECTAS = 100;
    const porcentaje = Math.min((correctas / MAX_CORRECTAS) * 100, 100);
    return Math.round(porcentaje);
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

  toggleTemaExpansion(temaNombre: string) {
    if (this.expandedTema === temaNombre) {
      this.expandedTema = null;
    } else {
      this.expandedTema = temaNombre;
    }
  }

  isTemaExpanded(temaNombre: string): boolean {
    return this.expandedTema === temaNombre;
  }

  getTemasForArea(areaName: string): any[] {
    const area = this.areaStats.find(a => a.area === areaName && !a.isGeneral);
    console.log('Buscando temas para área:', areaName, 'Area encontrada:', area);
    console.log('Temas:', area?.temas);
    return area && area.temas ? area.temas : [];
  }
  getSubtemasForTema(tema: any): any[] {
    return tema && tema.subtemas ? tema.subtemas : [];
  }

  // Obtener nivel de dominio según porcentaje
  getNivelDominio(porcentaje: number): string {
    if (porcentaje >= 80) return 'Experto';
    if (porcentaje >= 60) return 'Avanzado';
    if (porcentaje >= 40) return 'Intermedio';
    return 'Principiante';
  }

  // Obtener número de estrellas (0-3)
  getEstrellas(porcentaje: number): number {
    if (porcentaje >= 80) return 3;
    if (porcentaje >= 60) return 2;
    if (porcentaje >= 40) return 1;
    return 0;
  }

  // Obtener clase de color según nivel
  getNivelColor(porcentaje: number): string {
    if (porcentaje >= 80) return 'experto';
    if (porcentaje >= 60) return 'avanzado';
    if (porcentaje >= 40) return 'intermedio';
    return 'principiante';
  }

  // Obtener emoji según rendimiento
  getNivelEmoji(porcentaje: number): string {
    if (porcentaje >= 80) return '🏆';
    if (porcentaje >= 60) return '⭐';
    if (porcentaje >= 40) return '📚';
    return '🌱';
  }

  // Mensaje motivacional según rendimiento
  getMensajeMotivacional(porcentaje: number, totalPreguntas: number): string {
    if (totalPreguntas === 0) return '¡Comienza a practicar este tema!';
    if (porcentaje >= 80) return '¡Excelente dominio! Sigue así';
    if (porcentaje >= 60) return '¡Buen trabajo! Casi lo dominas';
    if (porcentaje >= 40) return 'Vas por buen camino, sigue practicando';
    return '⚠️ Necesitas reforzar este tema';
  }

  // Crear array de estrellas para mostrar
  getEstrellasArray(porcentaje: number): boolean[] {
    const estrellas = this.getEstrellas(porcentaje);
    return [
      estrellas >= 1,
      estrellas >= 2,
      estrellas >= 3
    ];
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