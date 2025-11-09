import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-procesal-reforzar',
  templateUrl: './procesal-reforzar.page.html',
  styleUrls: ['./procesal-reforzar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class ProcesalReforzarPage implements OnInit {
  
  isLoading: boolean = true;
  
  // Datos principales
  weakTopics: any[] = [];
  recentSessions: any[] = [];
  temas: any[] = [];
  
  // Control de secciones expandibles
  expandedSections: { [key: string]: boolean } = {
    'recentSessions': false
  };
  
  // Sesiones
  expandedSession: number | null = null;
  sessionDetails: any = null;
  isLoadingDetails: boolean = false;
  expandedQuestion: number | null = null;
  
  // Nueva lógica de práctica de errores
  practiceMode: 'mix' | 'tema' | null = null;
  selectedQuantity: number = 1;
  selectedTemaId: number | null = null;
  
  // Sets para tracking de errores
  temasConErrores: Set<number> = new Set();
  subtemasConErrores: Set<number> = new Set();
  
  constructor(
    private router: Router,
    private apiService: ApiService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  // =====================
  // CARGA DE DATOS
  // =====================

  async loadData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;

      // 1) Temas débiles SOLO de Derecho Procesal
      try {
        const weakResponse = await this.apiService.getWeakTopics(studentId).toPromise();
        if (weakResponse && weakResponse.success) {
          this.weakTopics = (weakResponse.data || []).filter((topic: any) => {
            return topic.area && topic.area.toLowerCase().includes('procesal');
          });
          
          // Marcar temas y subtemas con errores
          this.temasConErrores.clear();
          this.subtemasConErrores.clear();

          this.weakTopics.forEach(topic => {
            if (topic.temaId) {
              this.temasConErrores.add(topic.temaId);
            }
            if (topic.subtemaId) {
              this.subtemasConErrores.add(topic.subtemaId);
            }
          });
          
          console.log('✅ Temas débiles de PROCESAL:', this.weakTopics);
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      // 2) Sesiones recientes (Procesal)
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();

        if (sessionsResponse && sessionsResponse.success) {
          const raw = sessionsResponse.data || [];

          const soloProcesal = raw.filter((s: any) => {
            const areaName = (s.area || s.areaNombre || '').toLowerCase();
            const areaId = s.areaId || s.area_id;
            return areaName.includes('procesal') || areaId === 2;
          });

          const base = soloProcesal.length > 0 ? soloProcesal : raw;

          this.recentSessions = base
            .slice(0, 5)
            .map((s: any) => {
              const totalPreg = s.totalQuestions ?? s.totalquestions ?? s.questions ?? s.numeroPreguntas ?? 0;
              const correctas = s.correctAnswers ?? s.correct ?? s.correctas ?? s.totalCorrectas ?? 0;

              return {
                id: s.id ?? s.testId,
                testId: s.testId ?? s.id,
                date: s.date ?? s.fecha_test ?? s.fechaCreacion,
                area: s.area || s.areaNombre || 'Derecho Procesal',
                durationSeconds: s.durationSeconds ?? s.duration ?? 0,
                totalQuestions: totalPreg,
                correctAnswers: correctas,
                successRate: totalPreg > 0 ? Math.round((correctas / totalPreg) * 100) : 0
              };
            });

          console.log('✅ Sesiones Procesal:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
        this.recentSessions = [];
      }

      // 3) Temas y subtemas de Derecho Procesal
      try {
        const statsResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();
        
        if (statsResponse && statsResponse.success && statsResponse.data) {
          const procesalArea = statsResponse.data.find((item: any) => 
            item.type === 'area' && item.area === 'Derecho Procesal'
          );
          
          if (procesalArea && procesalArea.temas && procesalArea.temas.length > 0) {
            this.temas = procesalArea.temas.map((tema: any) => {
              const subtemasConPorcentaje = tema.subtemas.map((subtema: any) => {
                const porcentaje = subtema.totalPreguntas > 0 
                  ? Math.round((subtema.preguntasCorrectas / subtema.totalPreguntas) * 100)
                  : 0;
                return {
                  id: subtema.subtemaId,
                  nombre: subtema.subtemaNombre,
                  totalPreguntas: subtema.totalPreguntas,
                  preguntasCorrectas: subtema.preguntasCorrectas,
                  porcentaje,
                  cantidadPreguntas: subtema.totalPreguntas,
                  hasErrors: this.subtemaHasErrors(subtema.subtemaId)
                };
              });
              
              const porcentajeTema = subtemasConPorcentaje.length > 0
                ? Math.round(subtemasConPorcentaje.reduce((sum: number, sub: any) => 
                    sum + sub.porcentaje, 0) / subtemasConPorcentaje.length)
                : 0;

              // Calcular total de errores del tema
              const totalErroresTema = this.getTemaErrorCount(tema.temaId);

              return {
                id: tema.temaId,
                nombre: tema.temaNombre,
                cantidadPreguntas: tema.totalPreguntas,
                porcentaje: porcentajeTema,
                subtemas: subtemasConPorcentaje,
                hasErrors: this.temaHasErrors(tema.temaId),
                totalErrores: totalErroresTema
              };
            });

            console.log('✅ Temas Procesal:', this.temas);
          }
        }
      } catch (error) {
        console.error('Error cargando temas:', error);
        this.temas = [];
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // =====================
  // ERRORES POR TEMA
  // =====================

  getTemaErrorCount(temaId: number): number {
    const topic = this.weakTopics.find(t => t.temaId === temaId);
    return topic ? (topic.totalErrores || 0) : 0;
  }

  temaHasErrors(temaId: number): boolean {
    return this.temasConErrores.has(temaId);
  }

  subtemaHasErrors(subtemaId: number): boolean {
    return this.subtemasConErrores.has(subtemaId);
  }

  // =====================
  // PRÁCTICA DE ERRORES
  // =====================

  selectPracticeMode(mode: 'mix' | 'tema') {
    this.practiceMode = mode;
    if (mode === 'mix') {
      this.selectedTemaId = null;
    }
    console.log('✅ Modo seleccionado:', mode);
  }

  selectQuantity(quantity: number) {
    if (this.canSelectQuantity(quantity)) {
      this.selectedQuantity = quantity;
    }
  }

  canSelectQuantity(quantity: number): boolean {
    const available = this.getAvailableErrors();
    return available >= quantity;
  }

  getAvailableErrors(): number {
    if (this.practiceMode === 'mix') {
      // Total de errores de todos los temas
      return this.weakTopics.reduce((sum, topic) => sum + (topic.totalErrores || 0), 0);
    } else if (this.practiceMode === 'tema' && this.selectedTemaId) {
      // Errores del tema seleccionado
      return this.getTemaErrorCount(this.selectedTemaId);
    }
    return 0;
  }

  getTemasWithErrors(): any[] {
    return this.temas.filter(t => t.hasErrors && t.totalErrores > 0);
  }

  selectTemaForPractice(tema: any) {
    this.selectedTemaId = tema.id;
    console.log('✅ Tema seleccionado para práctica:', tema.nombre);
  }

  canStartTest(): boolean {
    if (!this.practiceMode) return false;
    if (this.practiceMode === 'tema' && !this.selectedTemaId) return false;
    return this.getAvailableErrors() >= this.selectedQuantity;
  }

  async startErrorPractice() {
    if (!this.canStartTest()) {
      const alert = await this.alertController.create({
        header: 'No se puede iniciar',
        message: 'Selecciona un modo de práctica válido',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const currentUser = this.apiService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.router.navigate(['/login']);
      return;
    }

    // Aquí iría la lógica para iniciar el test con solo preguntas con error
    console.log('🚀 Iniciando práctica de errores:', {
      mode: this.practiceMode,
      quantity: this.selectedQuantity,
      temaId: this.selectedTemaId
    });

    // TODO: Implementar endpoint que devuelva solo preguntas con error
    const alert = await this.alertController.create({
      header: 'Función en desarrollo',
      message: `Modo: ${this.practiceMode}, Cantidad: ${this.selectedQuantity}`,
      buttons: ['OK']
    });
    await alert.present();
  }

  // =====================
  // RECOMENDACIÓN
  // =====================

  getMainRecommendation() {
    if (this.weakTopics.length === 0) return null;
    
    const firstTopic = this.weakTopics[0];
    if (!firstTopic.area || !firstTopic.area.toLowerCase().includes('procesal')) {
      return null;
    }
    
    return firstTopic;
  }

  async selectWeakTopic(topic: any) {
    console.log('Tema débil seleccionado:', topic);
    // Aquí puedes navegar o iniciar test específico
  }

  // =====================
  // SECCIONES EXPANDIBLES
  // =====================

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section] || false;
  }

  // =====================
  // SESIONES
  // =====================

  async viewSession(session: any) {
    const sessionId = session.testId || session.id;
    
    if (this.expandedSession === sessionId) {
      this.expandedSession = null;
      this.sessionDetails = null;
      return;
    }

    this.expandedSession = sessionId;
    this.isLoadingDetails = true;
    this.expandedQuestion = null;

    try {
      const response = await this.apiService.getTestDetail(sessionId).toPromise();
      
      if (response && response.success) {
        this.sessionDetails = response.data;
        console.log('✅ Detalles de sesión:', this.sessionDetails);
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
    } finally {
      this.isLoadingDetails = false;
    }
  }

  toggleQuestion(index: number) {
    this.expandedQuestion = this.expandedQuestion === index ? null : index;
  }

  getQuestionOptions(question: any): string[] {
    if (!question || !question.options) return [];
    return question.options;
  }

  isOptionSelected(question: any, option: string): boolean {
    return question.userAnswer === option;
  }

  isOptionCorrect(question: any, option: string): boolean {
    return question.correctAnswer === option;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // =====================
  // NAVEGACIÓN
  // =====================

  goBack() {
    this.router.navigate(['/procesal']);
  }
}