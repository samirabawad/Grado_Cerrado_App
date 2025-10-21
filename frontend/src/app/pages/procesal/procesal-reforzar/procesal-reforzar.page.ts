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

  async loadData() {
    this.isLoading = true;
    
    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;

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
                ...subtema,
                porcentaje: porcentaje
              };
            });
            
            const porcentajeTema = subtemasConPorcentaje.length > 0
              ? Math.round(subtemasConPorcentaje.reduce((sum: number, s: any) => sum + s.porcentaje, 0) / subtemasConPorcentaje.length)
              : 0;
            
            return {
              ...tema,
              porcentaje: porcentajeTema,
              subtemas: subtemasConPorcentaje
            };
          });

          this.weakTopics = this.temas
            .filter(t => t.porcentaje < 70 && t.totalPreguntas > 0)
            .sort((a, b) => a.porcentaje - b.porcentaje)
            .slice(0, 5);
        }
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/procesal']);
  }

  selectScope(type: 'all' | 'tema' | 'subtema') {
    this.scopeType = type;
    
    if (type === 'all') {
      this.selectedTemaId = null;
      this.selectedSubtemaId = null;
      this.showThemeSelector = false;
    } else if (type === 'tema' || type === 'subtema') {
      this.showThemeSelector = true;
    }
  }

  selectTema(temaId: number) {
    this.selectedTemaId = temaId;
    
    if (this.scopeType === 'tema') {
      this.selectedSubtemaId = null;
    }
  }

  selectSubtema(subtemaId: number) {
    this.selectedSubtemaId = subtemaId;
  }

  async startReinforcement() {
    if (this.scopeType === 'tema' && !this.selectedTemaId) {
      const toast = await this.toastController.create({
        message: 'Selecciona un tema primero',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    if (this.scopeType === 'subtema' && !this.selectedSubtemaId) {
      const toast = await this.toastController.create({
        message: 'Selecciona un subtema primero',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Preparando test de refuerzo...',
      spinner: 'crescent'
    });
    
    await loading.present();
    
    try {
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        await loading.dismiss();
        alert('Debes iniciar sesión');
        return;
      }

      const sessionData: any = {
        studentId: currentUser.id,
        difficulty: "intermedio",
        legalAreas: ["Derecho Procesal"],
        questionCount: Number(this.selectedQuantity)
      };

      if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.temaId = this.selectedTemaId;
      }

      if (this.scopeType === 'subtema' && this.selectedSubtemaId) {
        sessionData.subtemaId = this.selectedSubtemaId;
      }

      console.log('📤 Iniciando test de refuerzo:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      
      if (sessionResponse && sessionResponse.success) {
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/procesal/procesal-escrito/test-escrito-procesal']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test de refuerzo');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error al iniciar refuerzo:', error);
      alert('Error al iniciar el test de refuerzo');
    }
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 70) return 'success';
    if (percentage >= 50) return 'warning';
    return 'danger';
  }
}