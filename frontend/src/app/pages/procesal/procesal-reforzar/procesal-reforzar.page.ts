import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
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


getMainRecommendation() {
  if (this.weakTopics.length === 0) return null;
  
  const firstTopic = this.weakTopics[0];
  if (!firstTopic.area || !firstTopic.area.toLowerCase().includes('procesal')) {
    return null;
  }
  
  return firstTopic;
}

// AGREGAR ESTOS MÉTODOS AQUÍ:
temasConErrores: Set<number> = new Set();
subtemasConErrores: Set<number> = new Set();

temaHasErrors(temaId: number): boolean {
  return this.temasConErrores.has(temaId);
}

subtemaHasErrors(subtemaId: number): boolean {
  return this.subtemasConErrores.has(subtemaId);
}

getErrorSubtemasCount(tema: any): number {
  if (!tema.subtemas) return 0;
  return tema.subtemas.filter((s: any) => this.subtemaHasErrors(s.id)).length;
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

// Cargar temas débiles SOLO DE PROCESAL
      try {
        const weakResponse = await this.apiService.getWeakTopics(studentId).toPromise();
        if (weakResponse && weakResponse.success) {
          this.weakTopics = (weakResponse.data || []).filter((topic: any) => {
            return topic.area && topic.area.toLowerCase().includes('procesal');
          });
          
          // Marcar temas y subtemas con errores
          this.weakTopics.forEach(topic => {
            if (topic.temaId) {
              this.temasConErrores.add(topic.temaId);
            }
            if (topic.subtemaId) {
              this.subtemasConErrores.add(topic.subtemaId);
            }
          });
          
          console.log('✅ Temas débiles de PROCESAL:', this.weakTopics);
          console.log('📍 Temas con errores:', Array.from(this.temasConErrores));
          console.log('📍 Subtemas con errores:', Array.from(this.subtemasConErrores));
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

// Cargar sesiones recientes SOLO DE PROCESAL
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 50).toPromise();
        console.log('📦 Respuesta RAW del backend:', sessionsResponse);
        
        if (sessionsResponse && sessionsResponse.success) {
          // Filtrar SOLO sesiones de Derecho Procesal y tomar las 5 más recientes
          this.recentSessions = (sessionsResponse.data || [])
            .filter((s: any) => s.area && s.area.toLowerCase().includes('procesal'))
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
          
          console.log('✅ Sesiones de PROCESAL mapeadas:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
        this.recentSessions = [];
      }

      // Cargar TODOS los temas y subtemas de Derecho Procesal (incluso sin preguntas)
      try {
        // Primero intentar con estadísticas
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
                  porcentaje: porcentaje,
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
            // Si no hay estadísticas, cargar estructura básica desde la BD
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
    // 2 = Derecho Procesal
    const response = await this.apiService.getTemasByArea(2).toPromise();

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

      console.log('✅ Temas cargados desde BD (Procesal):', this.temas);
    } else {
      console.warn('⚠️ Respuesta sin éxito cargando temas de Procesal:', response);
      this.temas = [];
    }
  } catch (error) {
    console.error('❌ Error cargando temas de Procesal desde BD:', error);
    this.temas = [];
  }
}

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

  // AGREGAR ESTOS DOS MÉTODOS AQUÍ:
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

    // Determinar si hay errores en el alcance seleccionado
    let hasErrorsInScope = false;
    
    if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
      hasErrorsInScope = this.subtemaHasErrors(this.selectedSubtemaId);
    } else if (this.scopeType === 'tema' && this.selectedTemaId) {
      hasErrorsInScope = this.temaHasErrors(this.selectedTemaId);
    } else if (this.scopeType === 'all') {
      hasErrorsInScope = this.temasConErrores.size > 0;
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
    
    // Usar endpoint de reforzamiento solo si hay errores
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
        
        // Esperar 2 segundos y luego iniciar test normal
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const normalSessionData = {
          studentId: currentUser.id,
          difficulty: "intermedio",
          legalAreas: ["Derecho Procesal"],
          numberOfQuestions: this.selectedQuantity,
          ...(sessionData.subtemaId && { SubtemaId: sessionData.subtemaId }),
          ...(sessionData.temaId && { TemaId: sessionData.temaId })
        };
        
        sessionResponse = await this.apiService.startStudySession(normalSessionData).toPromise();
      }
    } else {
      // No hay errores, usar test normal desde el inicio
      loading.message = 'Preparando test de práctica...';
      const normalSessionData = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Procesal"],
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

  goBack() {
    this.router.navigate(['/procesal']);
  }

  viewSession(session: any) {
    console.log('📊 Ver detalle de sesión:', session);
    const testId = session.testId || session.id;
    this.router.navigate(['/detalle-test', testId]);
  }
}