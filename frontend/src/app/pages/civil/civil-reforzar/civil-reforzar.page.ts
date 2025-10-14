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
  
  // Datos
  weakTopics: any[] = [];
  recentSessions: any[] = [];
  temas: any[] = [];
  
  // Selección
  selectedQuantity: number = 5;
  scopeType: 'all' | 'tema' | 'subtema' = 'all';
  selectedTemaId: number | null = null;
  selectedSubtemaId: number | null = null;
  expandedTema: number | null = null;
  
  // Estado
  isLoading: boolean = true;
  sessionsExpanded: boolean = false;

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController, // ✅ Agregado
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadData();
    this.loadTemas();
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

      // Cargar temas débiles
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

      // Cargar sesiones recientes
      try {
        const sessionsResponse = await this.apiService.getRecentSessions(studentId, 5).toPromise();
        if (sessionsResponse && sessionsResponse.success) {
          this.recentSessions = sessionsResponse.data || [];
          console.log('✅ Sesiones recientes:', this.recentSessions);
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

  loadTemas() {
    this.temas = [
      { 
        id: 135, 
        nombre: 'Parte General', 
        cantidadPreguntas: 15,
        subtemas: [
          { id: 41, nombre: 'Bienes', cantidadPreguntas: 5 },
          { id: 40, nombre: 'Personas jurídicas', cantidadPreguntas: 5 },
          { id: 39, nombre: 'Personas naturales', cantidadPreguntas: 5 },
        ]
      },
      { 
        id: 136, 
        nombre: 'Derechos Reales', 
        cantidadPreguntas: 11,
        subtemas: [
          { id: 43, nombre: 'Concepto general de derechos reales', cantidadPreguntas: 6 },
          { id: 44, nombre: 'Posesión', cantidadPreguntas: 5 },
        ]
      },
      { 
        id: 137, 
        nombre: 'Obligaciones y Contratos', 
        cantidadPreguntas: 3,
        subtemas: [
          { id: 50, nombre: 'Contratos en general', cantidadPreguntas: 3 },
        ]
      },
    ];
  }

  // ✅ NUEVO: Seleccionar tema débil
  selectWeakTopic(topic: any) {
    console.log('📖 Tema débil seleccionado:', topic);
    
    // Configurar el alcance como tema específico
    this.scopeType = 'tema';
    this.selectedTemaId = topic.temaId;
    this.selectedSubtemaId = null;
    
    // Scroll suave hacia el selector de preguntas
    setTimeout(() => {
      const quantitySection = document.querySelector('.quantity-section');
      if (quantitySection) {
        quantitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    // Mostrar feedback visual
    this.showToast(`Tema seleccionado: ${topic.nombre}`, 'primary');
  }

  // ✅ NUEVO: Formatear fechas
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
      
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
      return '';
    }
  }

  // ✅ NUEVO: Mostrar toast
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  toggleSessions() {
    this.sessionsExpanded = !this.sessionsExpanded;
  }

  toggleTema(tema: any) {
    if (tema.cantidadPreguntas === 0) return;
    
    if (this.expandedTema === tema.id) {
      this.expandedTema = null;
    } else {
      this.expandedTema = tema.id;
    }
  }

  selectScope(type: 'all' | 'tema') {
    this.scopeType = type;
    this.selectedTemaId = null;
    this.selectedSubtemaId = null;
    this.expandedTema = null;
  }

  selectTema(tema: any) {
    if (tema.cantidadPreguntas === 0) return;
    
    this.scopeType = 'tema';
    this.selectedTemaId = tema.id;
    this.selectedSubtemaId = null;
  }

  selectSubtema(subtema: any) {
    if (subtema.cantidadPreguntas === 0) return;
    
    this.scopeType = 'subtema';
    this.selectedSubtemaId = subtema.id;
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
      } else if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.TemaId = this.selectedTemaId;
      }
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      
      if (sessionResponse && sessionResponse.success) {
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test. Intenta nuevamente.');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error al iniciar test:', error);
      alert('Hubo un error al iniciar el test. Intenta nuevamente.');
    }
  }

  goBack() {
    this.router.navigate(['/civil']);
  }

  viewSession(session: any) {
  console.log('📊 Ver detalle de sesión:', session);
  this.router.navigate(['/detalle-test', session.id]);
}
}