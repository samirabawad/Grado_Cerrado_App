import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';

interface QuestionDetail {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  expectedAnswer: string;
  explanation: string;
  correct: boolean;
}

@Component({
  selector: 'app-resumen-test-civil-oral',
  templateUrl: './resumen-test-civil-oral.page.html',
  styleUrls: ['./resumen-test-civil-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class ResumenTestCivilOralPage implements OnInit {
  
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';
  motivationalMessage: string = '¡Sigue practicando!';
  
  questionsDetails: QuestionDetail[] = [];
  showDetailModal: boolean = false;
  selectedQuestion: QuestionDetail | null = null;

  constructor(
    private router: Router,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    try {
      const resultsString = localStorage.getItem('current_oral_test_results');
      
      if (!resultsString) {
        console.warn('No hay resultados guardados');
        this.router.navigate(['/civil/civil-oral']);
        return;
      }

      const results = JSON.parse(resultsString);
      
      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.totalQuestions = results.totalQuestions || 5;
      this.percentage = results.percentage || 0;

      if (results.questionDetails && results.questionDetails.length > 0) {
        this.questionsDetails = results.questionDetails;
      }

      this.calculateLevel();
      this.setMotivationalMessage();

    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.router.navigate(['/civil/civil-oral']);
    }
  }

  calculateLevel() {
    if (this.percentage >= 80) {
      this.levelTitle = 'NIVEL AVANZADO';
      this.levelSubtitle = '¡Excelente trabajo!';
    } else if (this.percentage >= 60) {
      this.levelTitle = 'NIVEL INTERMEDIO';
      this.levelSubtitle = '¡Muy bien!';
    } else {
      this.levelTitle = 'NIVEL PRINCIPIANTE';
      this.levelSubtitle = '¡Sigue practicando!';
    }
  }

  setMotivationalMessage() {
    if (this.percentage >= 90) {
      this.motivationalMessage = '¡Excelente! Dominas el tema';
    } else if (this.percentage >= 80) {
      this.motivationalMessage = '¡Muy bien! Vas por buen camino';
    } else if (this.percentage >= 70) {
      this.motivationalMessage = '¡Buen trabajo! Sigue así';
    } else if (this.percentage >= 60) {
      this.motivationalMessage = 'Vas progresando, continúa';
    } else if (this.percentage >= 40) {
      this.motivationalMessage = 'Sigue practicando, ¡tú puedes!';
    } else {
      this.motivationalMessage = 'No te rindas, ¡inténtalo de nuevo!';
    }
  }

  openQuestionDetail(question: QuestionDetail) {
    this.selectedQuestion = question;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedQuestion = null;
  }

  // ✅ MENSAJE SEGÚN RESULTADO

// ✅ MENSAJE PEQUEÑO SEGÚN RESULTADO
getSmallMessage(): string {
  if (this.percentage >= 90) {
    return '¡Increíble!';
  } else if (this.percentage >= 80) {
    return '¡Excelente trabajo!';
  } else if (this.percentage >= 70) {
    return '¡Muy bien!';
  } else if (this.percentage >= 60) {
    return 'Buen intento';
  } else if (this.percentage >= 40) {
    return 'Sigue adelante';
  } else {
    return 'No te rindas';
  }
}

// ✅ MENSAJE GRANDE SEGÚN RESULTADO
getLargeMessage(): string {
  if (this.percentage >= 90) {
    return '¡Dominas el tema!';
  } else if (this.percentage >= 80) {
    return '¡Vas por buen camino!';
  } else if (this.percentage >= 70) {
    return '¡Sigue así!';
  } else if (this.percentage >= 60) {
    return '¡Puedes mejorar!';
  } else if (this.percentage >= 40) {
    return '¡Sigue practicando!';
  } else {
    return '¡Inténtalo de nuevo!';
  }
}


  takeNewTest() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil/civil-oral']);
  }

  goBack() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil']);
  }
}