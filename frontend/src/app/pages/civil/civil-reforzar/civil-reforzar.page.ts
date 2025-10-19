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

  getMainRecommendation() {
    if (this.weakTopics.length === 0) return null;
    return this.weakTopics[0];
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

      try {
        const weakResponse = await this.apiService.getWeakTopics(studentId).toPromise();
        if (weakResponse && weakResponse.success) {
          this.weakTopics = weakResponse.data || [];
          console.log('✅ Temas débiles:', this.weakTopics);
        }
      } catch (error) {
        console.error('Error cargando temas débiles:', error);
        this.weakTopics = [];
      }

      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 5).toPromise();
        console.log('📦 Respuesta RAW del backend:', sessionsResponse);
        
        if (sessionsResponse && sessionsResponse.success) {
          this.recentSessions = (sessionsResponse.data || []).map((s: any) => ({
            id: s.id,
            testId: s.id,
            date: s.date,
            area: s.area,
            durationSeconds: s.duration || 0,
            totalQuestions: s.questions || 0,
            correctAnswers: s.correct || 0,
            successRate: s.successRate || 0
          }));
          
          console.log('✅ TODAS las sesiones mapeadas:', this.recentSessions);
        }
      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
        this.recentSessions = [];
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      this.isLoading = false;
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
      console.log('✅ Seleccionado: Todo Derecho Civil');
    } else if (type === 'tema') {
      this.selectedTemaId = id;
      this.selectedSubtemaId = null;
      console.log('✅ Tema seleccionado:', id);
    }
  }

  selectSubtema(subtema: any) {
    this.scopeType = 'subtema';
    this.selectedSubtemaId = subtema.id;
    
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
        legalAreas: ["Derecho Civil"],
        numberOfQuestions: this.selectedQuantity
      };

      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        sessionData.SubtemaId = this.selectedSubtemaId;
        console.log('🎯 Iniciando test de SUBTEMA:', this.selectedSubtemaId);
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.TemaId = this.selectedTemaId;
        console.log('🎯 Iniciando test de TEMA:', this.selectedTemaId);
      } else {
        console.log('🎯 Iniciando test de TODO Derecho Civil');
      }

      console.log('📤 Datos de sesión enviados:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      
      if (sessionResponse && sessionResponse.success) {
        this.apiService.setCurrentSession(sessionResponse);
        console.log('✅ Sesión iniciada correctamente');
        await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
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
    this.router.navigate(['/civil']);
  }

  viewSession(session: any) {
    console.log('📊 Ver detalle de sesión:', session);
    const testId = session.testId || session.id;
    this.router.navigate(['/detalle-test', testId]);
  }
}