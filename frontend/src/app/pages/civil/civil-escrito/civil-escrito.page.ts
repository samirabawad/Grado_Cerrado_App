import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-civil-escrito',
  templateUrl: './civil-escrito.page.html',
  styleUrls: ['./civil-escrito.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class CivilEscritoPage implements OnInit, OnDestroy, AfterViewInit {
  selectedQuantity: number = 1;
  selectedDifficulty: string = 'mixto';
  selectedDifficultyLabel: string = 'Mixto (Todos)';

  // Nuevas propiedades para tema
  scopeType: 'all' | 'tema' = 'all';
  showThemeSelector: boolean = false;
  selectedTemaId: number | null = null;
  temas: any[] = [];
  isLoading: boolean = false;

  difficultyLevels = [
    { value: 'basico', label: 'Básico' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'avanzado', label: 'Avanzado' },
    { value: 'mixto', label: 'Mixto (Todos)' }
  ];

  get infiniteLevels() {
    return [...this.difficultyLevels, ...this.difficultyLevels, ...this.difficultyLevels];
  }

  @ViewChild(IonContent) content!: IonContent;
  @ViewChild('pickerWheel') pickerWheel?: ElementRef;
  private scrollTimeout: any;

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadTemas();
  }

async loadQuestionCountByLevel(temaId: number) {
    try {
      const tema = this.temas.find(t => t.id === temaId);
      if (!tema) return;

      tema.preguntasPorNivel = {
        basico: 0,
        intermedio: 0,
        avanzado: 0
      };

      // Datos de Civil (area_id = 1)
      if (temaId === 136) { // Derechos Reales
        tema.preguntasPorNivel = { basico: 24, intermedio: 19, avanzado: 4 };
      } else if (temaId === 137) { // Obligaciones y Contratos
        tema.preguntasPorNivel = { basico: 17, intermedio: 6, avanzado: 3 };
      } else if (temaId === 135) { // Parte General
        tema.preguntasPorNivel = { basico: 4, intermedio: 6, avanzado: 2 };
      } else if (temaId === 140) { // Prescripción
        tema.preguntasPorNivel = { basico: 0, intermedio: 1, avanzado: 0 };
      } else if (temaId === 141) { // Responsabilidad Civil
        tema.preguntasPorNivel = { basico: 0, intermedio: 1, avanzado: 0 };
      } else if (temaId === 138) { // Derecho de Familia
        tema.preguntasPorNivel = { basico: 0, intermedio: 0, avanzado: 0 };
      } else if (temaId === 139) { // Derecho Sucesorio
        tema.preguntasPorNivel = { basico: 0, intermedio: 0, avanzado: 0 };
      }

      console.log('📊 Preguntas por nivel para tema', temaId, ':', tema.preguntasPorNivel);
    } catch (error) {
      console.error('Error cargando cantidad de preguntas por nivel:', error);
    }
  }

  ionViewWillEnter() {
    setTimeout(() => {
      this.content?.scrollToTop(300);
    }, 50);
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  async loadTemas() {
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
        const statsResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();

        if (statsResponse && statsResponse.success && statsResponse.data) {
          const civilArea = statsResponse.data.find(
            (item: any) => item.type === 'area' && item.area === 'Derecho Civil'
          );

          if (civilArea && civilArea.temas && civilArea.temas.length > 0) {
            this.temas = civilArea.temas
              .map((tema: any) => ({
                id: tema.temaId,
                nombre: tema.temaNombre,
                cantidadPreguntas: tema.totalPreguntas || 0
              }))
              .filter((tema: any) => tema.cantidadPreguntas > 0);

            console.log('✅ Temas cargados para selector:', this.temas);
          } else {
            console.log('⚠️ No hay temas en civil');
            this.temas = [];
          }
        }
      } catch (error) {
        console.error('Error cargando temas:', error);
        this.temas = [];
      }
    } catch (error) {
      console.error('Error general cargando temas:', error);
    } finally {
      this.isLoading = false;
    }
  }

// ✅ Método para saber cuántas preguntas permite el tema seleccionado Y nivel
  getMaxQuestionsForSelectedTema(): number {
    if (this.scopeType === 'all') {
      return 7; // Sin límite para "todo el temario"
    }
    
    if (this.selectedTemaId) {
      const tema = this.temas.find(t => t.id === this.selectedTemaId);
      if (!tema) return 0;
      
      // ✅ Si hay información por nivel, usarla
      if (tema.preguntasPorNivel) {
        // Si el nivel es mixto, retornar el total
        if (this.selectedDifficulty === 'mixto') {
          return tema.cantidadPreguntas || 0;
        }
        
        // Si es un nivel específico (basico, intermedio, avanzado)
        const nivel = this.selectedDifficulty;
        if (tema.preguntasPorNivel[nivel] !== undefined) {
          return tema.preguntasPorNivel[nivel];
        }
      }
      
      // Si no hay información por nivel, retornar el total
      return tema.cantidadPreguntas || 0;
    }
    
    return 0;
  }

  canSelectQuantity(quantity: number): boolean {
    const max = this.getMaxQuestionsForSelectedTema();
    return quantity <= max;
  }

  selectScope(type: 'all' | 'tema') {
    this.scopeType = type;

    if (type === 'all') {
      this.selectedTemaId = null;
      this.showThemeSelector = false;
      console.log('✅ Seleccionado: Todo Derecho Civil');
    } else if (type === 'tema') {
      this.showThemeSelector = !this.showThemeSelector;
      if (!this.showThemeSelector) {
        this.selectedTemaId = null;
      }
      console.log('✅ Modo tema:', this.showThemeSelector);
    }
  }

  async selectTema(temaId: number) {
    this.selectedTemaId = temaId;
    this.scopeType = 'tema';
    
    // ✅ NUEVO: Cargar cantidad de preguntas por nivel
    await this.loadQuestionCountByLevel(temaId);
    
    // ✅ Ajustar cantidad seleccionada si excede el límite
    const maxQuestions = this.getMaxQuestionsForSelectedTema();
    if (this.selectedQuantity > maxQuestions) {
      this.selectedQuantity = Math.min(maxQuestions, 1);
    }
    
    console.log('✅ Tema seleccionado:', temaId, 'Máx preguntas:', maxQuestions);
  }

  getSelectedTemaName(): string {
    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    return tema ? tema.nombre : '';
  }

  goBack() {
    this.router.navigate(['/civil']);
  }

  selectDifficulty(level: any) {
    console.log('🔄 Cambiando nivel de:', this.selectedDifficulty, 'a:', level.value);
    
    this.selectedDifficulty = level.value;
    this.selectedDifficultyLabel = level.label;
    
    // ✅ Obtener tema actual
    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    console.log('📚 Tema actual:', tema?.nombre, 'Preguntas por nivel:', tema?.preguntasPorNivel);
    
    // ✅ Ajustar cantidad si excede el máximo del nivel seleccionado
    const maxQuestions = this.getMaxQuestionsForSelectedTema();
    console.log('📊 Máximo de preguntas para nivel', level.value, ':', maxQuestions);
    
    if (this.selectedQuantity > maxQuestions && maxQuestions > 0) {
      console.log('⚠️ Cantidad seleccionada', this.selectedQuantity, 'excede el máximo', maxQuestions);
      this.selectedQuantity = Math.min(maxQuestions, 1);
      console.log('✅ Nueva cantidad ajustada:', this.selectedQuantity);
    }
  }

  onPickerScroll() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.snapToNearestOption();
    }, 150);
  }

  snapToNearestOption() {
    const wheel = this.pickerWheel?.nativeElement;
    if (!wheel) return;

    const options = wheel.querySelectorAll('.picker-option');
    const wheelRect = wheel.getBoundingClientRect();
    const wheelCenter = wheelRect.top + wheelRect.height / 2;

    let closestOption: any = null;
    let closestDistance = Infinity;

    options.forEach((option: any) => {
      const optionRect = option.getBoundingClientRect();
      const optionCenter = optionRect.top + optionRect.height / 2;
      const distance = Math.abs(wheelCenter - optionCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestOption = option;
      }
    });

    if (closestOption) {
      const value = closestOption.getAttribute('data-value');
      const level = this.difficultyLevels.find(l => l.value === value);
      if (level) {
        this.selectDifficulty(level);
      }

      closestOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  scrollToOption(index: number) {
    const wheel = this.pickerWheel?.nativeElement;
    if (!wheel) return;

    const options = wheel.querySelectorAll('.picker-option');
    if (options[index]) {
      options[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const level = this.difficultyLevels[index];
      this.selectDifficulty(level);
    }
  }

  scrollDifficultyUp() {
    const currentIndex = this.difficultyLevels.findIndex(l => l.value === this.selectedDifficulty);
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      this.scrollToOption(newIndex);
    } else {
      this.scrollToOption(this.difficultyLevels.length - 1);
    }
  }

  scrollDifficultyDown() {
    const currentIndex = this.difficultyLevels.findIndex(l => l.value === this.selectedDifficulty);
    if (currentIndex < this.difficultyLevels.length - 1) {
      const newIndex = currentIndex + 1;
      this.scrollToOption(newIndex);
    } else {
      this.scrollToOption(0);
    }
  }

  async startQuickPractice() {
    const loading = await this.loadingController.create({
      message: this.selectedQuantity === 1 ? 'Preparando tu pregunta...' : 'Preparando tu test...',
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

      const difficultyToSend = this.selectedDifficulty;

      const sessionData: any = {
        studentId: Number(currentUser.id),
        difficulty: difficultyToSend,
        legalAreas: ['Derecho Civil'],
        questionCount: Number(this.selectedQuantity)
      };

      if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.TemaId = this.selectedTemaId;
        console.log('📚 Test con tema específico:', this.selectedTemaId);
      } else {
        console.log('📚 Test con TODO Derecho Civil');
      }

      console.log('📤 Enviando request:', sessionData);

      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      console.log('📥 Respuesta del servidor:', sessionResponse);

      if (sessionResponse && sessionResponse.success) {
        console.log('✅ Preguntas recibidas:', sessionResponse.totalQuestions);
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/civil/civil-escrito/test-escrito-civil']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test. Intenta nuevamente.');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test:', error);
      alert('Hubo un error al iniciar el test. Intenta nuevamente.');
    }
  }
}
