import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
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

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadData();
  }

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


  // -------------------------------------------------
  // ERRORES POR TEMA (según weakTopics del backend)
  // -------------------------------------------------

  temasConErrores: Set<number> = new Set();
  subtemasConErrores: Set<number> = new Set(); // lo dejamos por si luego hay stats por subtema

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
            // OJO: ahora mismo el backend no manda subtemaId,
            // esto quedará vacío hasta que lo añadas en la API.
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

      // 2) Sesiones recientes SOLO de Derecho Civil (con fallback)
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();
        console.log('📦 Respuesta RAW del backend (civil reforzar):', sessionsResponse);

        if (sessionsResponse && sessionsResponse.success) {
          const raw = sessionsResponse.data || [];

          // 1️⃣ Intentar quedarnos solo con sesiones de Civil si vienen marcadas
          const soloCivil = raw.filter((s: any) => {
            const areaName = (s.area || s.areaNombre || '').toLowerCase();
            const areaId = s.areaId || s.area_id;

            const isCivilByName = areaName.includes('civil');
            const isCivilById = areaId === 1; // si en tu BD Civil = 1

            return isCivilByName || isCivilById;
          });

          // 2️⃣ Si NO hay ninguna marcada como Civil, usamos TODO (lo que te pasa ahora)
          const base = soloCivil.length > 0 ? soloCivil : raw;

          this.recentSessions = base
            .slice(0, 5)
            .map((s: any) => ({
              // Muchos backends cambian los nombres, así cubrimos varios casos:
              id: s.id ?? s.testId,
              testId: s.testId ?? s.id,
              date: s.date ?? s.fecha_test ?? s.fechaCreacion,
              area: s.area || s.areaNombre || 'Derecho Civil',
              durationSeconds: s.durationSeconds ?? s.duration ?? 0,
              totalQuestions: s.totalQuestions ?? s.questions ?? s.numeroPreguntas ?? 0,
              correctAnswers: s.correct ?? s.correctAnswers ?? s.totalCorrectas ?? 0,
              successRate: s.successRate ?? s.porcentajeAcierto ?? 0
            }));

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

  // Cuando haces clic en un "tema débil"
  selectWeakTopic(topic: any) {
    console.log('🎯 Tema débil seleccionado:', topic);
    // La API de weak-topics devuelve temaId, no subtemaId
    this.selectedTemaId = topic.temaId;
    this.selectedSubtemaId = null;
    this.scopeType = 'tema';
    this.showThemeSelector = true;
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
        // de momento casi siempre será false, porque no tenemos stats por subtema
        hasErrorsInScope = this.subtemaHasErrors(this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        hasErrorsInScope = this.temaHasErrors(this.selectedTemaId);
      } else if (this.scopeType === 'all') {
        // hay errores en algún tema de Civil
        hasErrorsInScope = this.weakTopics.some(t => t.area?.toLowerCase().includes('civil'));
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
          
          // Después de avisar, test normal
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

  goBack() {
    this.router.navigate(['/civil']);
  }

  viewSession(session: any) {
    console.log('📊 Ver detalle de sesión:', session);
    const testId = session.testId || session.id;
    this.router.navigate(['/detalle-test', testId]);
  }
}
