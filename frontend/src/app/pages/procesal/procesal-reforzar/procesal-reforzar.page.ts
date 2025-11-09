import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-procesal-reforzar',
  templateUrl: './procesal-reforzar.page.html',
  styleUrls: ['./procesal-reforzar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class ProcesalReforzarPage implements OnInit {

  @ViewChild(IonContent, { static: false }) ionContent!: IonContent;
  
  weakTopics: any[] = [];
  recentSessions: any[] = [];
  temas: any[] = [];
  expandedSession: number | null = null;
  expandedQuestion: number | null = null;
  sessionDetails: any = null;
  isLoadingDetails: boolean = false;
  
  expandedSections: { [key: string]: boolean } = {
    weakTopics: false,
    recentSessions: false,
    testSection: false
  };
  
  selectedQuantity: number = 5;
  scopeType: 'all' | 'tema' | 'subtema' = 'all';
  selectedTemaId: number | null = null;
  selectedSubtemaId: number | null = null;
  expandedTema: number | null = null;
  showThemeSelector: boolean = false;
  
  isLoading: boolean = true;
  practiceMode: 'mix' | 'tema' | null = null;

  // sets para marcar errores
  temasConErrores: Set<number> = new Set();
  subtemasConErrores: Set<number> = new Set();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const temaId = params['temaId'];
      const fromDashboard = params['fromDashboard'];
      
      if (fromDashboard === 'true' && temaId) {
        this.loadData().then(() => {
          // ACTIVAR modo tema
          this.practiceMode = 'tema';
          this.selectedTemaId = Number(temaId);
          this.scopeType = 'tema';
          this.showThemeSelector = true;
          this.expandedSections['testSection'] = true;
          
          console.log('✅ Navegando desde dashboard con tema:', {
            temaId: this.selectedTemaId,
            practiceMode: this.practiceMode,
            tema: this.temas.find(t => t.id === Number(temaId))
          });
        });
      } else {
        this.loadData();
      }
    });
  }

  // =====================
  // UI helpers
  // =====================

  toggleSection(section: string) {
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      Object.keys(this.expandedSections).forEach(key => {
        this.expandedSections[key] = false;
      });
      this.expandedSections[section] = true;
    }
  }

  toggleTema(temaId: number) {
    this.expandedTema = this.expandedTema === temaId ? null : temaId;
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // Recomendación principal solo si es de Derecho Procesal
  getMainRecommendation() {
    if (this.weakTopics.length === 0) return null;
    
    const firstTopic = this.weakTopics[0];
    if (!firstTopic.area || !firstTopic.area.toLowerCase().includes('procesal')) {
      return null;
    }
    
    return firstTopic;
  }

  getErrorSubtemasCount(tema: any): number {
    return this.getTemaErrorCount(tema.id);
  }

  // =====================
  // ERRORES POR TEMA
  // =====================

  /** nº de errores en este tema según weakTopics */
  getTemaErrorCount(temaId: number): number {
    const topic = this.weakTopics.find(t => t.temaId === temaId);
    return topic ? (topic.totalErrores || 0) : 0;
  }

  temaHasErrors(temaId: number): boolean {
    return this.getTemaErrorCount(temaId) > 0;
  }

  subtemaHasErrors(subtemaId: number): boolean {
    return this.subtemasConErrores.has(subtemaId);
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
            // actualmente casi nunca viene subtemaId
            if (topic.subtemaId) {
              this.subtemasConErrores.add(topic.subtemaId);
            }
          });
          
          console.log('✅ Temas débiles de PROCESAL:', this.weakTopics);
          console.log('📊 Temas con errores:', Array.from(this.temasConErrores));
          console.log('📊 Subtemas con errores:', Array.from(this.subtemasConErrores));
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      // 2) Sesiones recientes (Procesal si está marcado, si no todo)
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();
        console.log('📦 Respuesta RAW del backend (procesal reforzar):', sessionsResponse);

        if (sessionsResponse && sessionsResponse.success) {
          const raw = sessionsResponse.data || [];

          const soloProcesal = raw.filter((s: any) => {
            const areaName = (s.area || s.areaNombre || '').toLowerCase();
            const areaId = s.areaId || s.area_id;

            const isProcesalByName = areaName.includes('procesal');
            const isProcesalById = areaId === 2; // 2 = Procesal en tu BD

            return isProcesalByName || isProcesalById;
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

          console.log('✅ Sesiones que se van a mostrar en Procesal:', this.recentSessions);
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
          
          if (procesalArea && procesalArea.temas) {
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
  // SELECTOR DE ALCANCE/TEMA
  // =====================

  setScopeType(type: 'all' | 'tema' | 'subtema') {
    this.scopeType = type;
    if (type === 'all') {
      this.selectedTemaId = null;
      this.selectedSubtemaId = null;
    } else if (type === 'tema') {
      this.selectedSubtemaId = null;
    }
  }

  selectTema(temaId: number) {
    this.selectedTemaId = this.selectedTemaId === temaId ? null : temaId;
  }

  selectSubtema(subtemaId: number) {
    this.selectedSubtemaId = this.selectedSubtemaId === subtemaId ? null : subtemaId;
  }

  getSubtemasForTema(temaId: number): any[] {
    const tema = this.temas.find(t => t.id === temaId);
    return tema ? tema.subtemas : [];
  }

  async selectWeakTopic(topic: any) {
    this.practiceMode = 'tema';
    this.selectedTemaId = topic.temaId;
    this.scopeType = 'tema';
    this.showThemeSelector = true;
    this.expandedSections['testSection'] = true;
    
    await this.ionContent?.scrollToBottom(300);
  }

  // =====================
  // TEST
  // =====================

  async startTest() {
    const loading = await this.loadingController.create({
      message: 'Preparando test...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Debes iniciar sesión para hacer un test',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();
        this.router.navigate(['/login']);
        return;
      }

      // ¿Hay errores en el alcance seleccionado?
      let hasErrorsInScope = false;
      
      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        hasErrorsInScope = this.subtemaHasErrors(this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        hasErrorsInScope = this.temaHasErrors(this.selectedTemaId);
      } else if (this.scopeType === 'all') {
        hasErrorsInScope = this.weakTopics.some(t => t.area?.toLowerCase().includes('procesal'));
      }

      const sessionData: any = {
        studentId: currentUser.id,
        questionCount: this.selectedQuantity
      };

      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        sessionData.subtemaId = this.selectedSubtemaId;
        console.log('🎯 Iniciando test - SUBTEMA:', this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.temaId = this.selectedTemaId;
        console.log('🎯 Iniciando test - TEMA:', this.selectedTemaId);
      } else {
        console.log('🎯 Iniciando test - TODO Derecho Procesal');
      }

      console.log('📤 Datos de sesión enviados:', sessionData);
      console.log('🎯 Tiene errores en alcance:', hasErrorsInScope);

      let sessionResponse;
      
      // Usar endpoint de REFORZAMIENTO solo si hay errores
      if (hasErrorsInScope) {
        loading.message = 'Preparando test de reforzamiento...';
        sessionResponse = await this.apiService.startReinforcementSession(sessionData).toPromise();
        
        if (sessionResponse?.success && sessionResponse.noQuestionsToReinforce) {
          await loading.dismiss();
          const toast = await this.toastController.create({
            message: '✅ ¡Excelente! No tienes preguntas para reforzar. Iniciando test normal...',
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const normalSessionData = {
            studentId: currentUser.id,
            difficulty: 'intermedio',
            legalAreas: ['Derecho Procesal'],
            numberOfQuestions: this.selectedQuantity,
            ...(sessionData.subtemaId && { SubtemaId: sessionData.subtemaId }),
            ...(sessionData.temaId && { TemaId: sessionData.temaId })
          };
          
          sessionResponse = await this.apiService.startStudySession(normalSessionData).toPromise();
        }
      } else {
        // No hay errores → test normal
        loading.message = 'Preparando test de práctica...';
        const normalSessionData = {
          studentId: currentUser.id,
          difficulty: 'intermedio',
          legalAreas: ['Derecho Procesal'],
          numberOfQuestions: this.selectedQuantity,
          ...(sessionData.subtemaId && { SubtemaId: sessionData.subtemaId }),
          ...(sessionData.temaId && { TemaId: sessionData.temaId })
        };
        
        sessionResponse = await this.apiService.startStudySession(normalSessionData).toPromise();
      }
      
      if (sessionResponse?.success) {
        this.apiService.setCurrentSession(sessionResponse);
        console.log('✅ Sesión iniciada correctamente');
        await this.router.navigate(['/procesal/procesal-escrito/test-escrito-procesal']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        console.error('❌ Error en respuesta:', sessionResponse);
        
        const toast = await this.toastController.create({
          message: 'No se pudo iniciar el test. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test:', error);
      
      const toast = await this.toastController.create({
        message: 'Hubo un error al iniciar el test. Intenta nuevamente.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  // =====================
  // NAVEGACIÓN
  // =====================

  goBack() {
    this.router.navigate(['/procesal']);
  }

async viewSession(session: any) {
    const testId = session.testId || session.id;
    
    if (this.expandedSession === testId) {
      // Si ya está abierta, cerrarla
      this.expandedSession = null;
      this.sessionDetails = null;
      this.expandedQuestion = null;
    } else {
      // Abrir y cargar detalles
      this.expandedSession = testId;
      await this.loadSessionDetails(testId);
    }
  }

  async loadSessionDetails(testId: number) {
    this.isLoadingDetails = true;
    this.expandedQuestion = null;

    try {
      const response = await this.apiService.getTestDetail(testId).toPromise();
      
      if (response && response.success) {
        this.sessionDetails = response.data;
        console.log('Detalles del test cargados:', this.sessionDetails);
      }
    } catch (error) {
      console.error('Error cargando detalles del test:', error);
    } finally {
      this.isLoadingDetails = false;
    }
  }

  toggleQuestion(index: number) {
    if (this.expandedQuestion === index) {
      this.expandedQuestion = null;
    } else {
      this.expandedQuestion = index;
    }
  }

  getQuestionOptions(question: any): string[] {
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
      return ['Verdadero', 'Falso'];
    }
    
    if (Array.isArray(question.answers) && question.answers.length > 0) {
      return question.answers.map((answer: any) => answer.text);
    }
    
    return [];
  }

  isOptionSelected(question: any, option: string): boolean {
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
      return question.selectedAnswer === (option === 'Verdadero' ? 'true' : 'false');
    }
    return question.selectedAnswer === option;
  }

  isOptionCorrect(question: any, option: string): boolean {
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
      const correctBool = question.questionText.toLowerCase().includes('verdader') || 
                         question.answers?.some((a: any) => a.text.toLowerCase() === 'verdadero' && a.isCorrect);
      return (option === 'Verdadero') === correctBool;
    }
    
    const correctAnswer = question.answers?.find((a: any) => a.isCorrect);
    return correctAnswer?.text === option;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  selectQuantity(quantity: number) {
    this.selectedQuantity = quantity;
  }

  canSelectQuantity(quantity: number): boolean {
    return true;
  }

  getAvailableErrors(): number {
    return this.weakTopics.reduce((sum, topic) => sum + (topic.totalErrores || 0), 0);
  }

  selectPracticeMode(mode: 'mix' | 'tema') {
    this.practiceMode = mode;
    if (mode === 'mix') {
      this.selectedTemaId = null;
    }
  }

  getTemasWithErrors(): any[] {
    return this.temas.filter(t => t.hasErrors && t.totalErrores > 0);
  }

  selectTemaForPractice(tema: any) {
    this.selectedTemaId = tema.id;
  }

  canStartTest(): boolean {
    if (this.practiceMode === 'tema' && !this.selectedTemaId) return false;
    return this.getAvailableErrors() > 0;
  }

  async startErrorPractice() {
    await this.startTest();
  }
}