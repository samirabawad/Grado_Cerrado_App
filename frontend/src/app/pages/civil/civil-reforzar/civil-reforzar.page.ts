import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-reforzar',
  templateUrl: './civil-reforzar.page.html',
  styleUrls: ['./civil-reforzar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class CivilReforzarPage implements OnInit {

  @ViewChild(IonContent, { static: false }) ionContent!: IonContent;
  
  weakTopics: any[] = [];
  recentSessions: any[] = [];
  temas: any[] = [];
  
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

  // sets para marcar errores
  temasConErrores: Set<number> = new Set();
  subtemasConErrores: Set<number> = new Set(); // futuro por si hay stats por subtema

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  // =====================
  // UI helpers
  // =====================

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  toggleTema(temaId: number) {
    this.expandedTema = this.expandedTema === temaId ? null : temaId;
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // Recomendación principal solo si es de Derecho Civil
  getMainRecommendation() {
    if (this.weakTopics.length === 0) return null;
    
    const firstTopic = this.weakTopics[0];
    if (!firstTopic.area || !firstTopic.area.toLowerCase().includes('civil')) {
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

 // Cargar sesiones recientes SOLO DE CIVIL
    try {
      const sessionsResponse = await this.apiService.getRecentSessions(studentId, 50).toPromise();
      console.log('📦 Respuesta RAW del backend:', sessionsResponse);
      
      if (sessionsResponse && sessionsResponse.success) {
        // Filtrar SOLO sesiones de Derecho Civil y tomar las 5 más recientes
        this.recentSessions = (sessionsResponse.data || [])
          .filter((s: any) => s.area && s.area.toLowerCase().includes('civil'))
          .slice(0, 5)
          .map((s: any) => ({
            id: s.testId,
            testId: s.testId,
            date: s.date,
            area: s.area,
            durationSeconds: s.durationSeconds || 0,
            totalQuestions: s.totalQuestions || 0,
            correctAnswers: s.correctAnswers || 0,
            successRate: s.successRate || 0
          }));
        
        console.log('✅ Sesiones de CIVIL mapeadas:', this.recentSessions);
      }

      const studentId = currentUser.id;

      // 1) Temas débiles SOLO de Derecho Civil
      try {
        const weakResponse = await this.apiService.getWeakTopics(studentId).toPromise();
        if (weakResponse && weakResponse.success) {
          this.weakTopics = (weakResponse.data || []).filter((topic: any) => {
            return topic.area && topic.area.toLowerCase().includes('civil');
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
          
          console.log('✅ Temas débiles de CIVIL:', this.weakTopics);
          console.log('📍 Temas con errores:', Array.from(this.temasConErrores));
          console.log('📍 Subtemas con errores:', Array.from(this.subtemasConErrores));
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      // 2) Sesiones recientes (Civil si está marcado, si no todo)
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();
        console.log('📦 Respuesta RAW del backend (civil reforzar):', sessionsResponse);

        if (sessionsResponse && sessionsResponse.success) {
          const raw = sessionsResponse.data || [];

          const soloCivil = raw.filter((s: any) => {
            const areaName = (s.area || s.areaNombre || '').toLowerCase();
            const areaId = s.areaId || s.area_id;

            const isCivilByName = areaName.includes('civil');
            const isCivilById = areaId === 1; // 1 = Civil en tu BD (ajusta si no)

            return isCivilByName || isCivilById;
          });

          const base = soloCivil.length > 0 ? soloCivil : raw;

          this.recentSessions = base
            .slice(0, 5)
            .map((s: any) => {
              const totalPreg = s.totalQuestions ?? s.totalquestions ?? s.questions ?? s.numeroPreguntas ?? 0;
              const correctas = s.correctAnswers ?? s.correct ?? s.correctas ?? s.totalCorrectas ?? 0;

              return {
                id: s.id ?? s.testId,
                testId: s.testId ?? s.id,
                date: s.date ?? s.fecha_test ?? s.fechaCreacion,
                area: s.area || s.areaNombre || 'Derecho Civil',
                durationSeconds: s.durationSeconds ?? s.duration ?? 0,
                totalQuestions: totalPreg,
                correctAnswers: correctas,
                successRate: totalPreg > 0 ? Math.round((correctas / totalPreg) * 100) : 0
              };
            });

          console.log('✅ Sesiones que se van a mostrar en Civil:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
        this.recentSessions = [];
      }

      // 3) Temas y subtemas de Derecho Civil
      try {
        const statsResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();
        
        if (statsResponse && statsResponse.success && statsResponse.data) {
          const civilArea = statsResponse.data.find((item: any) => 
            item.type === 'area' && item.area === 'Derecho Civil'
          );
          
          if (civilArea && civilArea.temas && civilArea.temas.length > 0) {
            this.temas = civilArea.temas.map((tema: any) => {
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
              
              return {
                id: tema.temaId,
                nombre: tema.temaNombre,
                totalPreguntas: tema.totalPreguntas,
                preguntasCorrectas: tema.preguntasCorrectas,
                porcentaje: porcentajeTema,
                cantidadPreguntas: tema.totalPreguntas,
                subtemas: subtemasConPorcentaje,
                hasErrors: this.temaHasErrors(tema.temaId)
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
      // 1 = Derecho Civil
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

        console.log('✅ Temas cargados desde BD (Civil):', this.temas);
      } else {
        console.warn('⚠️ Respuesta sin éxito cargando temas de Civil:', response);
        this.temas = [];
      }
    } catch (error) {
      console.error('❌ Error cargando temas de Civil desde BD:', error);
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
    this.scopeType = 'tema';
    this.showThemeSelector = true;
    this.expandedTema = topic.temaId;
    this.expandedSections['testSection'] = true;
    
    setTimeout(() => {
      const testSection = document.querySelector('.test-section');
      if (testSection) {
        testSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
      console.log('✅ Seleccionado: Todo Derecho Civil');
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

      // ¿Hay errores en el alcance seleccionado?
      let hasErrorsInScope = false;
      
      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        hasErrorsInScope = this.subtemaHasErrors(this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        hasErrorsInScope = this.temaHasErrors(this.selectedTemaId);
      } else if (this.scopeType === 'all') {
        hasErrorsInScope = this.weakTopics.some(t => t.area?.toLowerCase().includes('civil'));
      }

      const sessionData: any = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Civil"],
        numberOfQuestions: this.selectedQuantity,
        allowRepeatedQuestions: true
      };

      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        sessionData.subtemaId = this.selectedSubtemaId;
        console.log('🎯 Iniciando test - SUBTEMA:', this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.temaId = this.selectedTemaId;
        console.log('🎯 Iniciando test - TEMA:', this.selectedTemaId);
      } else {
        console.log('🎯 Iniciando test - TODO Derecho Civil');
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
            legalAreas: ['Derecho Civil'],
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
          legalAreas: ['Derecho Civil'],
          numberOfQuestions: this.selectedQuantity,
          ...(sessionData.subtemaId && { SubtemaId: sessionData.subtemaId }),
          ...(sessionData.temaId && { TemaId: sessionData.temaId })
        };
        
        sessionResponse = await this.apiService.startStudySession(normalSessionData).toPromise();
      }
      
      if (sessionResponse?.success) {
        this.apiService.setCurrentSession(sessionResponse);
        console.log('✅ Sesión iniciada correctamente');
        await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
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
    this.router.navigate(['/civil']);
  }

  viewSession(session: any) {
    console.log('📊 Ver detalle de sesión:', session);
    const testId = session.testId || session.id;
    this.router.navigate(['/detalle-test', testId]);
  }
}
