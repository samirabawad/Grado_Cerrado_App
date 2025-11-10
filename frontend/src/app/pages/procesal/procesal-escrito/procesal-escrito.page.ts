import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, IonContent } from '@ionic/angular'; // ✅ Importar IonContent
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-procesal-escrito',
  templateUrl: './procesal-escrito.page.html',
  styleUrls: ['./procesal-escrito.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class ProcesalEscritoPage implements OnInit, OnDestroy, AfterViewInit {
  
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

  @ViewChild(IonContent) content!: IonContent; // ✅ Agregar ViewChild

  @ViewChild('pickerWheel') pickerWheel?: ElementRef;
  private scrollTimeout: any;

  constructor(
    private router: Router, 
    private loadingController: LoadingController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadTemas();
  }

  // ✅ Mover el scroll aquí
  ionViewWillEnter() {
    setTimeout(() => {
      this.content?.scrollToTop(300); // 300ms de animación suave
    }, 50);
  }
  ngAfterViewInit() {
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

    try {
      const statsResponse = await this.apiService.getHierarchicalStats(studentId).toPromise();
      
      if (statsResponse && statsResponse.success && statsResponse.data) {
        const procesalArea = statsResponse.data.find((item: any) => 
          item.type === 'area' && item.area === 'Derecho Procesal'
        );
        
        if (procesalArea && procesalArea.temas && procesalArea.temas.length > 0) {
          this.temas = procesalArea.temas
            .map((tema: any) => ({
              id: tema.temaId,
              nombre: tema.temaNombre,
              cantidadPreguntas: tema.totalPreguntas || 0
            }))
            .filter((tema: any) => tema.cantidadPreguntas > 0); // ✅ Solo temas con preguntas

          console.log('✅ Temas cargados para selector:', this.temas);
        } else {
          console.log('⚠️ No hay temas en Procesal');
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

// ✅ Método para saber cuántas preguntas permite el tema seleccionado
getMaxQuestionsForSelectedTema(): number {
  if (this.scopeType === 'all') {
    return 7; // Sin límite para "todo el temario"
  }
  
  if (this.selectedTemaId) {
    const tema = this.temas.find(t => t.id === this.selectedTemaId);
    return tema ? tema.cantidadPreguntas : 0;
  }
  
  return 0;
}

// ✅ Validar si una cantidad está disponible
canSelectQuantity(quantity: number): boolean {
  const max = this.getMaxQuestionsForSelectedTema();
  return quantity <= max;
}

  selectScope(type: 'all' | 'tema') {
    this.scopeType = type;
    
    if (type === 'all') {
      this.selectedTemaId = null;
      this.showThemeSelector = false;
      console.log('✅ Seleccionado: Todo Derecho Procesal');
    } else if (type === 'tema') {
      this.showThemeSelector = !this.showThemeSelector;
      if (!this.showThemeSelector) {
        this.selectedTemaId = null;
      }
      console.log('✅ Modo tema:', this.showThemeSelector);
    }
  }

  selectTema(temaId: number) {
    this.selectedTemaId = temaId;
    this.scopeType = 'tema';
    
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
    this.router.navigate(['/procesal']);
  }

  selectDifficulty(level: any) {
    this.selectedDifficulty = level.value;
    this.selectedDifficultyLabel = level.label;
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
        legalAreas: ["Derecho Procesal"],
        questionCount: Number(this.selectedQuantity)
      };

      // Agregar TemaId si está seleccionado
      if (this.scopeType === 'tema' && this.selectedTemaId) {
        sessionData.TemaId = this.selectedTemaId;
        console.log('📚 Test con tema específico:', this.selectedTemaId);
      } else {
        console.log('📚 Test con TODO Derecho Procesal');
      }
      
      console.log('📤 Enviando request:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      console.log('📥 Respuesta del servidor:', sessionResponse);
      
      if (sessionResponse && sessionResponse.success) {
        console.log('✅ Preguntas recibidas:', sessionResponse.totalQuestions);
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/procesal/procesal-escrito/test-escrito-procesal']);
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