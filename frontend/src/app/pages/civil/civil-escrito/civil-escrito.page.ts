import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
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
export class CivilEscritoPage implements OnInit, OnDestroy {  selectedQuantity: number = 1;
  selectedDifficulty: string = 'mixto';
  selectedDifficultyLabel: string = 'Mixto (Todos)';

  // Nuevas propiedades para tema
  scopeType: 'all' | 'tema' = 'all';
  showThemeSelector: boolean = false;
  selectedTemaId: number | null = null;
  temas: any[] = [];
  isLoading: boolean = false;

  difficultyLevels = [
    { index: 0, value: 'basico', label: 'Básico' },
    { index: 1, value: 'intermedio', label: 'Intermedio' },
    { index: 2, value: 'avanzado', label: 'Avanzado' },
    { index: 3, value: 'mixto', label: 'Mixto (Todos)' }
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

    console.log('🔍 Cargando preguntas activas por nivel para tema:', temaId);

    const response = await this.apiService.getQuestionCountByLevel(temaId).toPromise();
    console.log('📥 Respuesta del servidor:', response);

    if (response?.success) {
      tema.preguntasPorNivel = response.data;

      // ⭐ NUEVO: calcular total basado SOLO en preguntas activas
      tema.cantidadPreguntas =
        (tema.preguntasPorNivel.basico || 0) +
        (tema.preguntasPorNivel.intermedio || 0) +
        (tema.preguntasPorNivel.avanzado || 0);

      console.log('✨ Total de preguntas activas:', tema.cantidadPreguntas);

      // ⭐ NUEVO: si NO hay preguntas activas, eliminar el tema
      if (tema.cantidadPreguntas === 0) {
        console.warn('❌ Tema sin preguntas activas, removiendo:', tema.nombre);
        this.temas = this.temas.filter(t => t.id !== temaId);
        this.selectedTemaId = null;
      }
    }
  } catch (error) {
    console.error('❌ Error cargando preguntas por nivel:', error);
  }
}

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

      const statsResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();

      if (statsResponse?.success && statsResponse.data) {
        const civilArea = statsResponse.data.find(
          (item: any) => item.type === 'area' && item.area === 'Derecho Civil'
        );

        if (civilArea?.temas) {
          // Cargar lista base
          this.temas = civilArea.temas.map((tema: any) => ({
            id: tema.temaId,
            nombre: tema.temaNombre,
            cantidadPreguntas: 0,     // este se reemplaza luego con preguntas activas
            preguntasPorNivel: null   // lo llenaremos abajo
          }));

          console.log('🟡 Temas iniciales (sin filtro activo):', this.temas);

          // ⭐ AGREGADO CRÍTICO: para cada tema cargamos su conteo REAL (solo activas)
          for (let tema of this.temas) {
            const levelData = await this.apiService.getQuestionCountByLevel(tema.id).toPromise();

            if (levelData?.success) {
              tema.preguntasPorNivel = levelData.data;

              // Calcular cantidad total de preguntas activas
              tema.cantidadPreguntas =
                (tema.preguntasPorNivel.basico ?? 0) +
                (tema.preguntasPorNivel.intermedio ?? 0) +
                (tema.preguntasPorNivel.avanzado ?? 0);
            }
          }

          // ⭐ FILTRAR SOLO LOS TEMAS CON ≥ 1 PREGUNTA ACTIVA
          this.temas = this.temas.filter(t => t.cantidadPreguntas > 0);

          console.log('🟢 Temas finales (solo activos):', this.temas);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando temas:', error);
      this.temas = [];
    } finally {
      this.isLoading = false;
    }
  }

// ✅ Método para saber cuántas preguntas permite el tema seleccionado Y nivel

  getMaxQuestionsForSelectedTema(): number {
    if (this.scopeType === 'all') return 7;

    if (!this.selectedTemaId) return 0;

    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    if (!tema || !tema.preguntasPorNivel) return 0;

    if (this.selectedDifficulty === 'mixto') {
      return tema.cantidadPreguntas || 0;
    }

    return tema.preguntasPorNivel[this.selectedDifficulty] || 0;
  }


  canSelectQuantity(q: number) {
    const disponibles = this.getMaxQuestionsForSelectedTema();
    return q <= disponibles;
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

    await this.loadQuestionCountByLevel(temaId);

    // recalcular después de cargar
    const maxQuestions = this.getMaxQuestionsForSelectedTema();
    console.log('📊 Máximo disponible:', maxQuestions);

    if (this.selectedQuantity > maxQuestions && maxQuestions > 0) {
      this.selectedQuantity = 1;
    }
  }

  getSelectedTemaName(): string {
    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    return tema ? tema.nombre : '';
  }

  goBack() {
    this.router.navigate(['/civil']);
  }

  selectDifficulty(level: any) {
    this.selectedDifficulty = level.value;
    this.selectedDifficultyLabel = level.label;
    
    // ✅ Ajustar cantidad inmediatamente
    const maxQuestions = this.getMaxQuestionsForSelectedTema();
    console.log('🔄 Nivel:', level.value, '| Máximo:', maxQuestions);
    
    if (this.selectedQuantity > maxQuestions && maxQuestions > 0) {
      this.selectedQuantity = 1;
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
    const index = parseInt(closestOption.getAttribute('data-index'));
    const level = this.difficultyLevels[index];

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
