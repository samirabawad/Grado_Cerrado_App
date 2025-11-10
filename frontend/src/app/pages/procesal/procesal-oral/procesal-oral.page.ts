import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-procesal-oral',
  templateUrl: './procesal-oral.page.html',
  styleUrls: ['./procesal-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class ProcesalOralPage implements OnInit, OnDestroy, AfterViewInit {
  
  selectedQuantity: number = 1;
  selectedDifficulty: string = 'mixto';
  selectedDifficultyLabel: string = 'Mixto (Todos)';
  responseMethod: 'voice' | 'selection' = 'voice';

  difficultyLevels = [
    { value: 'basico', label: 'Básico' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'avanzado', label: 'Avanzado' },
    { value: 'mixto', label: 'Mixto (Todos)' }
  ];

  get infiniteLevels() {
    return [...this.difficultyLevels, ...this.difficultyLevels, ...this.difficultyLevels];
  }

  @ViewChild('pickerWheel') pickerWheel?: ElementRef;
  private scrollTimeout: any;

  constructor(
    private router: Router, 
    private loadingController: LoadingController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
  }

ngAfterViewInit() {
}

  ngOnDestroy() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
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
      // Si está en el primero, ir al último
      this.scrollToOption(this.difficultyLevels.length - 1);
    }
  }

  scrollDifficultyDown() {
    const currentIndex = this.difficultyLevels.findIndex(l => l.value === this.selectedDifficulty);
    if (currentIndex < this.difficultyLevels.length - 1) {
      const newIndex = currentIndex + 1;
      this.scrollToOption(newIndex);
    } else {
      // Si está en el último, ir al primero
      this.scrollToOption(0);
    }
  }

  
  async startVoicePractice() {
    const loading = await this.loadingController.create({
      message: this.selectedQuantity === 1 ? 'Preparando tu pregunta oral...' : 'Preparando tu test oral...',
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

      const difficultyToSend = this.selectedDifficulty === 'mixto' ? null : this.selectedDifficulty;

      const sessionData: any = {
        studentId: Number(currentUser.id),
        difficulty: difficultyToSend,
        legalAreas: ["Derecho Procesal"],
        questionCount: Number(this.selectedQuantity),
        responseMethod: this.responseMethod
      };
      
      console.log('📤 Enviando request ORAL:', sessionData);
      
      const sessionResponse = await this.apiService.startStudySession(sessionData).toPromise();
      
      console.log('📥 Respuesta del servidor ORAL:', sessionResponse);
      
      if (sessionResponse && sessionResponse.success) {
        console.log('✅ Preguntas orales recibidas:', sessionResponse.totalQuestions);
        
        // ⚠️ CRÍTICO: Agregar responseMethod ANTES de guardar la sesión
        sessionResponse.responseMethod = this.responseMethod;
        
        this.apiService.setCurrentSession(sessionResponse);
        await this.router.navigate(['/procesal/procesal-oral/test-oral-procesal']);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        alert('No se pudo iniciar el test oral. Intenta nuevamente.');
      }
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al iniciar test oral:', error);
      alert('Hubo un error al iniciar el test oral. Intenta nuevamente.');
    }
  }
}