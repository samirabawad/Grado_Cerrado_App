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
    // Solo devolver recomendación si hay datos REALES de procesal
    if (this.weakTopics.length === 0) return null;
    
    // Verificar que el tema débil sea realmente de procesal
    const firstTopic = this.weakTopics[0];
    if (!firstTopic.area || !firstTopic.area.toLowerCase().includes('procesal')) {
      return null;
    }
    
    return firstTopic;
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
          // Filtrar SOLO temas de Derecho Procesal
          this.weakTopics = (weakResponse.data || []).filter((topic: any) => {
            // Verificar que el área sea Derecho Procesal
            return topic.area && topic.area.toLowerCase().includes('procesal');
          });
          
          console.log('✅ Temas débiles de PROCESAL:', this.weakTopics);
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      // Cargar sesiones recientes SOLO DE PROCESAL
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 20).toPromise();
        console.log('📦 Respuesta RAW del backend:', sessionsResponse);
        
        if (sessionsResponse && sessionsResponse.success) {
          // Filtrar SOLO sesiones de Derecho Procesal
          this.recentSessions = (sessionsResponse.data || [])
            .filter((s: any) => s.area && s.area.toLowerCase().includes('procesal'))
            .slice(0, 5) // Tomar solo las 5 más recientes
            .map((s: any) => ({
              id: s.id,
              testId: s.id,
              date: s.date,
              area: s.area,
              durationSeconds: s.duration || 0,
              totalQuestions: s.questions || 0,
              correctAnswers: s.correct || 0,
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
                  cantidadPreguntas: subtema.totalPreguntas
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
                subtemas: subtemasConPorcentaje
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
      // Cargar temas básicos de procesal desde la estructura de BD
      const temasBasicos = [
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

      this.temas = temasBasicos.map(tema => ({
        id: tema.id,
        nombre: tema.nombre,
        totalPreguntas: 0,
        preguntasCorrectas: 0,
        porcentaje: 0,
        cantidadPreguntas: 0,
        subtemas: [
          { id: tema.id * 100 + 1, nombre: 'Conceptos básicos', cantidadPreguntas: 0, porcentaje: 0 },
          { id: tema.id * 100 + 2, nombre: 'Aplicación práctica', cantidadPreguntas: 0, porcentaje: 0 },
          { id: tema.id * 100 + 3, nombre: 'Casos especiales', cantidadPreguntas: 0, porcentaje: 0 }
        ]
      }));

      console.log('✅ Temas cargados desde estructura base:', this.temas);
    } catch (error) {
      console.error('Error cargando temas base:', error);
      this.temas = [];
    }
  }

  selectWeakTopic(topic: any) {
    console.log('🎯 Tema débil seleccionado:', topic);
    this.selectedSubtemaId = topic.subtemaId;
    this.scopeType = 'subtema';
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
        alert('Debes iniciar sesión para hacer un test');
        this.router.navigate(['/login']);
        return;
      }

      const sessionData: any = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Procesal"],
        numberOfQuestions: this.selectedQuantity
      };

      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        sessionData.SubtemaId = this.selectedSubtemaId;
        console.log('🎯 Iniciando test de SUBTEMA:', this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.TemaId = this.selectedTemaId;
        console.log('🎯 Iniciando test de TEMA:', this.selectedTemaId);
      } else {
        console.log('🎯 Iniciando test de TODO Derecho Procesal');
      }

      console.log('📤 Datos de sesión enviados:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      
      if (sessionResponse && sessionResponse.success) {
        this.apiService.setCurrentSession(sessionResponse);
        console.log('✅ Sesión iniciada correctamente');
        await this.router.navigate(['/procesal/procesal-escrito/test-escrito-procesal']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        console.error('❌ Error en respuesta:', sessionResponse);
        alert('No se pudo iniciar el test. Intenta nuevamente.');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test:', error);
      alert('Hubo un error al iniciar el test. Intenta nuevamente.');
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