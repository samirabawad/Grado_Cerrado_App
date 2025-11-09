import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('areaStatsSection', { read: ElementRef }) areaStatsSection!: ElementRef;

  userName: string = 'Estudiante';
  userLevel: string = 'Intermedio';
  userStreak: number = 0;
  currentWeekLabel: string = '';

  totalSessions: number = 0;
  totalQuestions: number = 0;
  totalCorrectAnswers: number = 0;
  overallSuccessRate: number = 0;
  currentGoal: number = 200;
  currentSessionGoal: number = 50;

  chartData: any[] = [];
  areaStats: any[] = [];
  
  
  isLoading: boolean = true;
  selectedTimeFrame: string = 'week';
  currentSemester: number = 1; 
  currentMonthName: string = '';
  expandedArea: string | null = null;
  expandedTema: string | null = null;
  isGeneralExpanded: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  async ngOnInit() {
    this.updateWeekLabel(); 
    await this.loadDashboardData();
  }

  ionViewWillEnter() {
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
          
          // PRIMERO procesamos las áreas (Civil y Procesal)
          const areasNoGenerales: any[] = [];
          
          areaResponse.data.forEach((item: any) => {
            if (item.type === 'area') {
              const temasConNuevoCalculo = item.temas.map((tema: any) => {
                const subtemasConPorcentaje = tema.subtemas.map((subtema: any) => ({
                  subtemaId: subtema.subtemaId,
                  subtemaNombre: subtema.subtemaNombre,
                  totalPreguntas: subtema.totalPreguntas,
                  preguntasCorrectas: subtema.preguntasCorrectas,
                  porcentajeAcierto: this.calculateSubtemaSuccessRate(subtema)                }));

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
              
              areasNoGenerales.push({
                area: item.area,
                sessions: 0,
                totalQuestions: totalPreguntas,
                correctAnswers: totalCorrectas,
                successRate: porcentajeArea,
                isGeneral: false,
                colorBarra: item.area === 'Derecho Civil' ? 'naranja' : 'azul',
                temas: temasConNuevoCalculo
              });
            }
          });

          if (!areasNoGenerales.find(a => a.area === 'Derecho Procesal')) {
            const temasProcesalBase = this.getDefaultProcesalTemas();
            areasNoGenerales.push({
              area: 'Derecho Procesal',
              sessions: 0,
              totalQuestions: 0,
              correctAnswers: 0,
              successRate: 0,
              isGeneral: false,
              colorBarra: 'azul',
              temas: temasProcesalBase
            });
          }

          // AHORA calculamos el "General" como promedio de Civil y Procesal
          const civilArea = areasNoGenerales.find(a => a.area === 'Derecho Civil');
          const procesalArea = areasNoGenerales.find(a => a.area === 'Derecho Procesal');
          
          const promedioGeneral = civilArea && procesalArea 
            ? Math.round((civilArea.successRate + procesalArea.successRate) / 2)
            : 0;

          // Agregar el área General CON EL PROMEDIO CALCULADO
          this.areaStats.push({
            area: 'General',
            sessions: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            successRate: promedioGeneral,
            isGeneral: true,
            colorBarra: 'verde',
            temas: []
          });

          // Agregar las áreas no generales
          this.areaStats = [...this.areaStats, ...areasNoGenerales];
          
          console.log('Estadísticas procesadas:', this.areaStats);
        }
      } catch (error) {
        console.error('Error cargando estadísticas por área:', error);
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

  getDefaultProcesalTemas(): any[] {
    const temasBase = [
      { id: 1, nombre: 'Jurisdicción' },
      { id: 2, nombre: 'Acción procesal' },
      { id: 3, nombre: 'Proceso' },
      { id: 4, nombre: 'Competencia' },
      { id: 5, nombre: 'Prueba' },
      { id: 6, nombre: 'Cosa juzgada' },
      { id: 7, nombre: 'Organización judicial' },
      { id: 8, nombre: 'Procedimientos' },
      { id: 9, nombre: 'Medidas cautelares e incidentes' },
      { id: 10, nombre: 'Representación procesal' },
      { id: 11, nombre: 'Recursos' }
    ];

    return temasBase.map(tema => ({
      temaId: tema.id,
      temaNombre: tema.nombre,
      totalPreguntas: 0,
      preguntasCorrectas: 0,
      porcentajeAcierto: 0,
      subtemas: [
        {
          subtemaId: tema.id * 100 + 1,
          subtemaNombre: 'Conceptos básicos',
          totalPreguntas: 0,
          preguntasCorrectas: 0,
          porcentajeAcierto: 0
        },
        {
          subtemaId: tema.id * 100 + 2,
          subtemaNombre: 'Aplicación práctica',
          totalPreguntas: 0,
          preguntasCorrectas: 0,
          porcentajeAcierto: 0
        },
        {
          subtemaId: tema.id * 100 + 3,
          subtemaNombre: 'Casos especiales',
          totalPreguntas: 0,
          preguntasCorrectas: 0,
          porcentajeAcierto: 0
        }
      ]
    }));
  }

  calculateAreaSuccessRate(temas: any[]): number {
    if (!temas || temas.length === 0) return 0;
    
    const totalPorcentaje = temas.reduce((sum: number, tema: any) => {
      return sum + tema.porcentajeAcierto;
    }, 0);
    
    return Math.round(totalPorcentaje / temas.length);
  }

  calculateTemaSuccessRate(subtemas: any[]): number {
    if (!subtemas || subtemas.length === 0) return 0;
    
    const totalPorcentaje = subtemas.reduce((sum: number, subtema: any) => {
      return sum + subtema.porcentajeAcierto;
    }, 0);
    
    return Math.round(totalPorcentaje / subtemas.length);
  }

  calculateSubtemaSuccessRate(subtema: any): number {
    if (subtema.porcentajeAcierto !== undefined) {
      return Math.round(subtema.porcentajeAcierto);
    }
    
    if (subtema.totalPreguntas === 0) return 0;
    return Math.round((subtema.preguntasCorrectas / subtema.totalPreguntas) * 100);
  }

  toggleGeneralExpansion() {
    this.isGeneralExpanded = !this.isGeneralExpanded;
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
    return area && area.temas ? area.temas : [];
  }

  getSubtemasForTema(tema: any): any[] {
    return tema && tema.subtemas ? tema.subtemas : [];
  }

  getGeneralArea(): any {
    return this.areaStats.find(a => a.isGeneral);
  }

  getNonGeneralAreas(): any[] {
    return this.areaStats.filter(a => !a.isGeneral);
  }

  scrollToArea(areaName: string) {
    const element = document.getElementById('area-' + areaName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        this.toggleAreaExpansion(areaName);
      }, 500);
    }
  }

  async generateChartData() {
    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) return;

      const progressResponse = await this.apiService.getWeeklyProgress(currentUser.id).toPromise();
      if (progressResponse && progressResponse.success) {
        this.chartData = progressResponse.data;
      }
    } catch (error) {
      console.error('Error generando datos del gráfico:', error);
      this.chartData = [];
    }
  }

async changeTimeFrame(timeFrame: string) {
  this.selectedTimeFrame = timeFrame;
  if (timeFrame === 'month') {
    const currentMonth = new Date().getMonth() + 1;
    this.currentSemester = currentMonth <= 6 ? 0 : 1;
    await this.loadMonthlyData();
  } else {
    this.updateWeekLabel();
    await this.generateChartData();
  }
}

async loadMonthlyData() {
  try {
    const currentUser = this.apiService.getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    const progressResponse = await this.apiService.getMonthlyProgress(
      currentUser.id, 
      this.currentSemester
    ).toPromise();
    
    if (progressResponse && progressResponse.success) {
      this.chartData = progressResponse.data;
      this.updateMonthName();
    }
  } catch (error) {
    console.error('Error cargando datos mensuales:', error);
    this.chartData = [];
  }
}

updateMonthName() {
  const year = new Date().getFullYear();
  this.currentMonthName = this.currentSemester === 0 
    ? `Enero - Junio ${year}` 
    : `Julio - Diciembre ${year}`;
}

updateWeekLabel() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const mondayDay = monday.getDate();
  const sundayDay = sunday.getDate();
  const mondayMonth = months[monday.getMonth()];
  const sundayMonth = months[sunday.getMonth()];
  const year = sunday.getFullYear();
  
  if (monday.getMonth() === sunday.getMonth()) {
    this.currentWeekLabel = `Semana del ${mondayDay} al ${sundayDay} de ${sundayMonth} ${year}`;
  } else {
    this.currentWeekLabel = `Semana del ${mondayDay} de ${mondayMonth} al ${sundayDay} de ${sundayMonth} ${year}`;
  }
}

async navigateMonth(direction: number) {
  // Cambiar entre semestre 0 y 1
  if (direction > 0 && this.currentSemester < 1) {
    this.currentSemester = 1;
  } else if (direction < 0 && this.currentSemester > 0) {
    this.currentSemester = 0;
  }
  await this.loadMonthlyData();
}

  goBack() {
    this.router.navigate(['/home']);
  }

  goToSession(sessionId: number) {
    console.log('Navegando a sesión:', sessionId);
  }

  startNewSession() {
    this.router.navigate(['/civil']);
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  getMaxValue(): number {
    if (this.chartData.length === 0) return 10;
    
    // Si estamos en vista mensual, el máximo siempre es 100
    if (this.selectedTimeFrame === 'month') {
      return 100;
    }
    
    // Si estamos en vista semanal, calculamos el máximo dinámicamente
    const maxCivil = Math.max(...this.chartData.map(d => d.civil || 0));
    const maxProcesal = Math.max(...this.chartData.map(d => d.procesal || 0));
    const maxTotal = Math.max(maxCivil, maxProcesal);
    return maxTotal === 0 ? 10 : maxTotal + 2;
  }

  getBarHeight(value: number, type: 'civil' | 'procesal'): number {
  if (!value || value === 0) return 0;
  
  // Encuentra el valor máximo en todo el chartData
  const maxValue = Math.max(
    ...this.chartData.map(day => Math.max(day.civil, day.procesal))
  );
  
  // Si no hay datos, retorna 0
  if (maxValue === 0) return 0;
  
  // Calcula el porcentaje basado en el máximo
  // Multiplicamos por 100 para obtener porcentaje
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

  // ========================================
  // MÉTODOS PARA SISTEMA DE LOGROS
  // ========================================
  
  // Obtener sesiones dentro del milestone actual (de 0 a 50)
  getSessionsInCurrentMilestone(): number {
    return this.totalSessions % 50;
  }

  // Obtener el siguiente milestone (múltiplo de 50)
  getNextMilestone(): number {
    return Math.ceil((this.totalSessions + 1) / 50) * 50;
  }

  // Obtener el nivel del logro actual (cuántos milestones de 50 has completado)
  // Obtener el nivel del logro actual (cuántos logros has desbloqueado)
  getCurrentAchievementLevel(): number {
    // Si no has completado ningún logro, estás en nivel 0
    if (this.totalSessions < 50) return 0;
    
    // Calcular cuántos logros de 50 tests has completado
    return Math.floor(this.totalSessions / 50);
  }

  // Obtener el nombre del logro actual
  getCurrentAchievementName(): string {
    const level = this.getCurrentAchievementLevel();
    
    // Si no has completado el primer logro
    if (level === 0) {
      return 'En progreso';
    }
    
    const names = [
      'Principiante',      // 50
      'Aprendiz',          // 100
      'Estudiante',        // 150
      'Dedicado',          // 200
      'Perseverante',      // 250
      'Comprometido',      // 300
      'Avanzado',          // 350
      'Experto',           // 400
      'Maestro',           // 450
      'Sabio',             // 500
      'Erudito',           // 550
      'Virtuoso',          // 600
      'Prodigio',          // 650
      'Genio',             // 700
      'Leyenda',           // 750
      'Titán',             // 800
      'Campeón',           // 850
      'Héroe',             // 900
      'Inmortal',          // 950
      'Supremo',           // 1000
      'Trascendental',     // 1050
      'Divino',            // 1100
      'Omnisciente',       // 1150
      'Absoluto',          // 1200
      'Infinito',          // 1250
      'Eterno',            // 1300
      'Celestial',         // 1350
      'Ilimitado',         // 1400
      'Perfecto',          // 1450
      'Definitivo'         // 1500
    ];
    
    return names[level - 1] || 'Maestro Supremo';
  }

  // ========================================
// MÉTODO PARA GENERAR BADGES DINÁMICOS
// ========================================
  getSessionBadges(): { completed: boolean }[] {
    const sessionsInMilestone = this.getSessionsInCurrentMilestone();
    const badges: { completed: boolean }[] = [];
    
    // Siempre mostrar 10 círculos
    const totalBadges = 10;
    const testsPerBadge = 5; // Cada círculo representa 5 tests
    
    for (let i = 1; i <= totalBadges; i++) {
      badges.push({
        completed: sessionsInMilestone >= i * testsPerBadge
      });
    }
    
    return badges;
  }

  // Obtener el ícono del logro actual
  getCurrentAchievementIcon(): string {
    const level = this.getCurrentAchievementLevel();
    
    // Si no has completado ningún logro, mostrar un ícono de "en progreso"
    if (level === 0) {
      return 'time-outline';
    }
    
    const icons = [
      'ribbon',          // 50 Principiante
      'school',          // 100 Aprendiz
      'book',            // 150 Estudiante
      'heart',           // 200 Dedicado
      'fitness',         // 250 Perseverante
      'medal',           // 300 Comprometido
      'trending-up',     // 350 Avanzado
      'star',            // 400 Experto
      'trophy',          // 450 Maestro
      'diamond',         // 500 Sabio
      'bulb',            // 550 Erudito
      'musical-notes',   // 600 Virtuoso
      'sparkles',        // 650 Prodigio
      'flash',           // 700 Genio
      'rocket',          // 750 Leyenda
      'shield',          // 800 Titán
      'flag',            // 850 Campeón
      'star-half',       // 900 Héroe
      'infinite',        // 950 Inmortal
      'diamond',         // 1000 Supremo
      'prism',           // 1050 Trascendental
      'sunny',           // 1100 Divino
      'eye',             // 1150 Omnisciente
      'nuclear',         // 1200 Absoluto
      'infinite',        // 1250 Infinito
      'time',            // 1300 Eterno
      'planet',          // 1350 Celestial
      'expand',          // 1400 Ilimitado
      'checkmark-circle',// 1450 Perfecto
      'star'             // 1500 Definitivo
    ];
    
    return icons[level - 1] || 'trophy';
  }

  // Obtener el color del logro actual
  getCurrentAchievementColor(): string {
    const level = this.getCurrentAchievementLevel();
    
    // Si no has completado ningún logro
    if (level === 0) {
      return '#9ca3af';
    }
    
    const colors = [
      '#10b981', '#059669', '#047857', '#065f46', '#064e3b',
      '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e',
      '#7c2d12', '#78350f', '#10b981', '#059669', '#047857',
      '#065f46', '#064e3b', '#fbbf24', '#f59e0b', '#d97706',
      '#b45309', '#92400e', '#7c2d12', '#78350f', '#10b981',
      '#059669', '#047857', '#065f46', '#064e3b', '#fbbf24'
    ];
    
    return colors[level - 1] || '#10b981';
  }

  // Navegar a página de logros
  navigateToAchievements() {
    this.router.navigate(['/logros']);
  }

  // Obtener mensaje motivacional
  getSessionMessage(): string {
    const remaining = this.getNextMilestone() - this.totalSessions;
    
    if (this.totalSessions === 0) {
      return '¡Empieza a aprender!';
    }
    
    if (remaining === 0) {
      return '¡Logro desbloqueado! 🎉';
    }
    
    if (remaining <= 5) {
      return `¡Solo ${remaining} para el logro!`;
    }
    
    if (this.totalSessions >= 30) {
      return '¡Vas excelente!';
    }
    
    if (this.totalSessions >= 10) {
      return '¡Tú puedes más!';
    }
    
    return '¡Sigue así!';
  }

  // =====================
  // PUNTOS DÉBILES
  // =====================

  getTop3WeakTopicsCivil(): any[] {
    if (!this.areaStats || this.areaStats.length === 0) return [];
    
    const civilArea = this.areaStats.find(a => a.area === 'Derecho Civil');
    if (!civilArea || !civilArea.temas) return [];

    // Obtener todos los temas con sus errores
    const temasConErrores = civilArea.temas
      .map((tema: any) => {
        const totalPreguntas = tema.totalPreguntas || 0;
        const correctas = tema.preguntasCorrectas || 0;
        const incorrectas = totalPreguntas - correctas;
        const tasaError = totalPreguntas > 0 ? (incorrectas / totalPreguntas) * 100 : 0;

        return {
          nombre: tema.temaNombre,
          totalErrores: incorrectas,
          totalIntentos: totalPreguntas,
          tasaError: tasaError,
          temaId: tema.temaId
        };
      })
      .filter((tema: any) => tema.totalErrores > 0) // Solo temas con errores
      .sort((a: any, b: any) => b.tasaError - a.tasaError); // Ordenar por tasa de error descendente

    return temasConErrores.slice(0, 3); // Top 3
  }

  getTop3WeakTopicsProcesal(): any[] {
    if (!this.areaStats || this.areaStats.length === 0) return [];
    
    const procesalArea = this.areaStats.find(a => a.area === 'Derecho Procesal');
    if (!procesalArea || !procesalArea.temas) return [];

    // Obtener todos los temas con sus errores
    const temasConErrores = procesalArea.temas
      .map((tema: any) => {
        const totalPreguntas = tema.totalPreguntas || 0;
        const correctas = tema.preguntasCorrectas || 0;
        const incorrectas = totalPreguntas - correctas;
        const tasaError = totalPreguntas > 0 ? (incorrectas / totalPreguntas) * 100 : 0;

        return {
          nombre: tema.temaNombre,
          totalErrores: incorrectas,
          totalIntentos: totalPreguntas,
          tasaError: tasaError,
          temaId: tema.temaId
        };
      })
      .filter((tema: any) => tema.totalErrores > 0) // Solo temas con errores
      .sort((a: any, b: any) => b.tasaError - a.tasaError); // Ordenar por tasa de error descendente

    return temasConErrores.slice(0, 3); // Top 3
  }

  goToReforzarWithTopic(area: 'civil' | 'procesal', topic: any) {
    const route = area === 'civil' ? '/civil/civil-reforzar' : '/procesal/procesal-reforzar';
    this.router.navigate([route], {
      queryParams: { 
        temaId: topic.temaId,
        fromDashboard: 'true'
      }
    });
  }
}