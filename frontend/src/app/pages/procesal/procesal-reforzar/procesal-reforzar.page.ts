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
  subtemasConErrores: Set<number> = new Set(); // futuro por si hay stats por subtema

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
    return this.getErroresTema(tema.id);
  }

  // =====================
  // ERRORES POR TEMA
  // =====================

  /** nº de errores en este tema según weakTopics */
  getErroresTema(temaId: number): number {
    const topic = this.weakTopics.find(t => t.temaId === temaId);
    return topic ? (topic.totalErrores || 0) : 0;
  }

  temaHasErrors(temaId: number): boolean {
    return this.getErroresTema(temaId) > 0;
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
          
          console.log('✅ Temas débiles de procesal:', this.weakTopics);
          console.log('📍 Temas con errores:', Array.from(this.temasConErrores));
          console.log('📍 Subtemas con errores:', Array.from(this.subtemasConErrores));
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      // 2) Sesiones recientes (procesal si está marcado, si no todo)
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();
        console.log('📋 Respuesta RAW del backend (procesal reforzar):', sessionsResponse);

        if (sessionsResponse && sessionsResponse.success) {
          const raw = sessionsResponse.data || [];

          const soloprocesal = raw.filter((s: any) => {
            const areaName = (s.area || s.areaNombre || '').toLowerCase();
            const areaId = s.areaId || s.area_id;

            const isprocesalByName = areaName.includes('procesal');
            const isprocesalById = areaId === 1; // 1 = procesal en tu BD (ajusta si no)

            return isprocesalByName || isprocesalById;
          });

          const base = soloprocesal.length > 0 ? soloprocesal : raw;

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

          console.log('✅ Sesiones que se van a mostrar en procesal:', this.recentSessions);
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
                ? Math.round(subtemasConPorcentaje.reduce((sum: number, s: any) => sum + s.porcentaje, 0) / subtemasConPorcentaje.length)
                : 0;

              // Calcular total de errores del tema
              const totalErroresTema = this.getErroresTema(tema.temaId);
              
              return {
                id: tema.temaId,
                nombre: tema.temaNombre,
                totalPreguntas: tema.totalPreguntas,
                preguntasCorrectas: tema.preguntasCorrectas,
                porcentaje: porcentajeTema,
                cantidadPreguntas: tema.totalPreguntas,
                subtemas: subtemasConPorcentaje,
                hasErrors: this.temaHasErrors(tema.temaId),
                totalErrores: totalErroresTema
              };
            });

            console.log('✅ Temas cargados desde estadísticas:', this.temas);
          } else {
            console.log('⚠️ No hay estadísticas, cargando estructura de BD...');
            await this.loadTemasFromDatabase();
          }
        } else {
          console.log('⚠️ No hay estadísticas, cargando estructura de BD...');
          await this.loadTemasFromDatabase();
        }
      } catch (error) {
        console.error('Error cargando temas:', error);
        await this.loadTemasFromDatabase();
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadTemasFromDatabase() {
    try {
      // 1 = Derecho Procesal
      const response = await this.apiService.getTemasByArea(1).toPromise();

      if (response && response.success) {
        const temasDesdeApi = response.data || [];

        this.temas = temasDesdeApi.map((tema: any) => ({
          id: tema.id,
          nombre: tema.nombre,
          totalPreguntas: 0,
          preguntasCorrectas: 0,
          porcentaje: 0,
          cantidadPreguntas: 0,
          subtemas: (tema.subtemas || []).map((sub: any) => ({
            id: sub.id,
            nombre: sub.nombre,
            cantidadPreguntas: 0,
            porcentaje: 0
          }))
        }));

        console.log('✅ Temas cargados desde BD (procesal):', this.temas);
      } else {
        console.warn('⚠️ Respuesta sin éxito cargando temas de procesal:', response);
        this.temas = [];
      }
    } catch (error) {
      console.error('❌ Error cargando temas de procesal desde BD:', error);
      this.temas = [];
    }
  }

  // =====================
  // SCROLL AL TEST
  // =====================

  scrollToTestSection() {
    // abrir sección de test
    this.expandedSections['testSection'] = true;

    // pequeño delay para que Angular pinte la sección abierta
    setTimeout(() => {
      const el = document.getElementById('test-section');
      if (el && this.ionContent) {
        const y = el.offsetTop - 60; // ajusta el 60 si el header es más grande/pequeño
        this.ionContent.scrollToPoint(0, y, 500); // 500 ms de animación
      }
    }, 0);
  }

// =====================
// SELECCIÓN DE ALCANCE
// =====================

// Cuando haces clic en un "tema débil"
selectWeakTopic(topic: any) {
  console.log('🎯 Tema débil seleccionado:', topic);
  this.selectedTemaId = topic.temaId;
  this.selectedSubtemaId = null;
  this.scopeType = 'tema';
  this.showThemeSelector = true;

  // ir a la sección de Test
  this.scrollToTestSection();
}

toggleTemaExpansion(temaId: number) {
  this.expandedTema = this.expandedTema === temaId ? null : temaId;
}

selectScope(type: 'all' | 'tema' | 'subtema', id: number | null = null) {
  this.scopeType = type;
  
  if (type === 'all') {
    this.selectedTemaId = null;
    this.selectedSubtemaId = null;
    this.showThemeSelector = false;
    console.log('✅ Seleccionado: Todo Derecho Procesal');
  } else if (type === 'tema') {
    this.selectedTemaId = id;
    this.selectedSubtemaId = null;
    this.showThemeSelector = true;
    console.log('✅ Tema seleccionado:', id);
  } else if (type === 'subtema') {
    this.showThemeSelector = true;
    console.log('✅ Modo subtema activado');
  }
}

selectSubtema(subtema: any) {
  this.scopeType = 'subtema';
  this.selectedSubtemaId = subtema.id;
  this.selectedTemaId = null;
  
  console.log('✅ Subtema seleccionado:', {
    subtemaId: subtema.id,
    nombre: subtema.nombre,
    scopeType: this.scopeType
  });
}

onSelectTema(tema: any, event: Event) {
  event.stopPropagation();
  this.selectScope('tema', tema.id);
}

onSelectSubtema(subtema: any) {
  this.selectSubtema(subtema);
}

// =====================
// INICIO DEL TEST
// =====================

async startTest() {
  const loading = await this.loadingController.create({
    message: 'Preparando test...',
    spinner: 'crescent',
    cssClass: 'custom-loading'
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

    // ✅ Construir sessionData base
    const sessionData: any = {
      studentId: currentUser.id,
      questionCount: this.selectedQuantity,
      difficulty: 'intermedio',
      legalAreas: ['Derecho Procesal']
    };

    // ✅ Agregar filtros de alcance
    if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
      sessionData.SubtemaId = this.selectedSubtemaId;
      console.log('🎯 Iniciando test - SUBTEMA:', this.selectedSubtemaId);
    } else if (this.scopeType === 'tema' && this.selectedTemaId) {
      sessionData.TemaId = this.selectedTemaId;
      console.log('🎯 Iniciando test - TEMA:', this.selectedTemaId);
    } else {
      console.log('🎯 Iniciando test - TODO Derecho Procesal');
    }

    console.log('📤 Datos de sesión enviados:', sessionData);

    // ✅ Verificar si hay errores
    let hasErrorsInScope = false;
    
    if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
      hasErrorsInScope = this.subtemaHasErrors(this.selectedSubtemaId);
    } else if (this.scopeType === 'tema' && this.selectedTemaId) {
      hasErrorsInScope = this.temaHasErrors(this.selectedTemaId);
    } else if (this.scopeType === 'all') {
      hasErrorsInScope = this.weakTopics.some(t => t.area?.toLowerCase().includes('procesal'));
    }

    console.log('🎯 Tiene errores en alcance:', hasErrorsInScope);

    let sessionResponse;
    
    // ✅ Usar endpoint correcto según si hay errores
    if (hasErrorsInScope) {
      loading.message = 'Preparando test de reforzamiento...';
      
      // ✅ Para reforzamiento, usar formato diferente
      const reinforcementData = {
        studentId: currentUser.id,
        questionCount: this.selectedQuantity,
        ...(this.selectedSubtemaId && { SubtemaId: this.selectedSubtemaId }),
        ...(this.selectedTemaId && { TemaId: this.selectedTemaId })
      };
      
      sessionResponse = await this.apiService.startReinforcementSession(reinforcementData).toPromise();
      
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
        
        // ✅ Usar sessionData que ya tiene todo configurado
        sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      }
    } else {
      // ✅ Test normal - usar sessionData directamente
      loading.message = 'Preparando test de práctica...';
      sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
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

// ✅ Validar si una cantidad está disponible
canSelectQuantity(quantity: number): boolean {
  // Si no hay modo seleccionado, permitir todas las cantidades
  if (!this.practiceMode) {
    return true;
  }

  const max = this.getMaxAvailableQuestions();
  return quantity <= max;
}

// ✅ Método para obtener el máximo de preguntas disponibles según el modo
getMaxAvailableQuestions(): number {
  // Si no hay modo seleccionado, retornar 0
  if (!this.practiceMode) {
    return 0;
  }
  
  if (this.practiceMode === 'mix') {
    // Modo mixto: sumar TODOS los errores de todos los temas
    return this.weakTopics.reduce((sum, topic) => sum + (topic.totalErrores || 0), 0);
  } else if (this.practiceMode === 'tema' && this.selectedTemaId) {
    // Modo tema específico: solo errores de ese tema
    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    return tema ? (tema.totalErrores || 0) : 0;
  }
  
  return 0;
}

getOptionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

// ✅ Actualizar selectQuantity para ajustar automáticamente
selectQuantity(quantity: number) {
  const maxAvailable = this.getMaxAvailableQuestions();
  
  if (quantity <= maxAvailable) {
    this.selectedQuantity = quantity;
  } else {
    // Ajustar a la cantidad máxima disponible
    this.selectedQuantity = Math.max(1, Math.min(maxAvailable, 7));
  }
}

// ✅ Método para obtener errores disponibles (actualizado)
getAvailableErrors(): number {
  return this.getMaxAvailableQuestions();
}

// ✅ Actualizar selectPracticeMode para ajustar cantidad
selectPracticeMode(mode: 'mix' | 'tema') {
  this.practiceMode = mode;
  
  if (mode === 'mix') {
    this.selectedTemaId = null;
    
    // Ajustar cantidad si excede el nuevo límite
    const maxAvailable = this.getMaxAvailableQuestions();
    if (this.selectedQuantity > maxAvailable) {
      this.selectedQuantity = Math.max(1, Math.min(maxAvailable, 7));
    }
  }
}

getTemasWithErrors(): any[] {
  return this.temas.filter(t => t.hasErrors && t.totalErrores > 0);
}

// ✅ Actualizar selectTemaForPractice para ajustar cantidad
selectTemaForPractice(tema: any) {
  this.selectedTemaId = tema.id;
  
  // Ajustar cantidad si excede el límite del tema
  const maxAvailable = this.getMaxAvailableQuestions();
  if (this.selectedQuantity > maxAvailable) {
    this.selectedQuantity = Math.max(1, Math.min(maxAvailable, 7));
  }
}

// ✅ Actualizar canStartTest
canStartTest(): boolean {
  const maxAvailable = this.getMaxAvailableQuestions();
  
  if (maxAvailable === 0) {
    return false; // No hay errores disponibles
  }
  
  if (this.practiceMode === 'tema' && !this.selectedTemaId) {
    return false; // Modo tema pero no hay tema seleccionado
  }
  
  if (this.selectedQuantity > maxAvailable) {
    return false; // Cantidad seleccionada excede disponible
  }
  
  return true;
}

async startErrorPractice() {
  await this.startTest();
}


}