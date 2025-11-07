import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { trigger, transition, style, animate } from '@angular/animations';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  options?: any[];
  type?: string;
}

@Component({
  selector: 'app-resumen-test-procesal',
  templateUrl: './resumen-test-procesal.page.html',
  styleUrls: ['./resumen-test-procesal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class ResumenTestProcesalPage implements OnInit {
  
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';
  motivationalMessage: string = '¡Sigue practicando!';
  
  questionResults: QuestionResult[] = [];
  incorrectQuestions: QuestionResult[] = [];
  
  expandedQuestionIndex: number | null = null;

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    const resultsData = localStorage.getItem('current_test_results');
    
    if (!resultsData) {
      console.error('No hay resultados guardados');
      this.router.navigate(['/procesal/procesal-escrito']);
      return;
    }

    try {
      const results = JSON.parse(resultsData);
      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.totalQuestions = results.totalQuestions || 0;
      this.percentage = results.percentage || 0;

      if (results.allQuestions && Array.isArray(results.allQuestions)) {
        this.questionResults = results.allQuestions.map((r: any) => ({
          questionNumber: r.questionNumber,
          questionText: r.questionText,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation || 'Sin explicación disponible',
          isCorrect: r.isCorrect,
          options: r.options || [],
          type: r.type || 'multiple_choice'
        }));

        this.incorrectQuestions = this.questionResults.filter(q => !q.isCorrect);
      }

      this.setLevel();
      this.setMotivationalMessage();

    } catch (error) {
      console.error('Error al parsear resultados:', error);
      this.router.navigate(['/procesal/procesal-escrito']);
    }
  }

  formatAnswer(answer: any): string {
    if (answer === null || answer === undefined) return 'Sin respuesta';
    if (typeof answer === 'boolean') return answer ? 'Verdadero' : 'Falso';
    return String(answer);
  }

  setLevel() {
    if (this.percentage >= 90) {
      this.levelTitle = 'NIVEL EXPERTO';
      this.levelSubtitle = '¡Dominas el tema!';
    } else if (this.percentage >= 70) {
      this.levelTitle = 'NIVEL AVANZADO';
      this.levelSubtitle = '¡Muy buen trabajo!';
    } else if (this.percentage >= 50) {
      this.levelTitle = 'NIVEL INTERMEDIO';
      this.levelSubtitle = 'Vas por buen camino';
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

  toggleQuestion(index: number) {
    if (this.expandedQuestionIndex === index) {
      this.expandedQuestionIndex = null;
    } else {
      this.expandedQuestionIndex = index;
    }
  }

  reviewIncorrect() {
    localStorage.setItem('questions_to_review', JSON.stringify(this.incorrectQuestions));
    this.router.navigate(['/procesal/procesal-reforzar']);
  }

  takeNewTest() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/procesal/procesal-escrito']);
  }

  goBack() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/procesal/procesal-escrito']);
  }

  goToHome() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/dashboard']);
  }

  getQuestionOptions(question: any): string[] {
    if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
      return ['Verdadero', 'Falso'];
    }
    
    if (Array.isArray(question.options) && question.options.length > 0) {
      const firstOption = question.options[0];
      
      if (typeof firstOption === 'object') {
        if ('text' in firstOption && firstOption.text) {
          return question.options.map((opt: any) => opt.text);
        }
        if ('Text' in firstOption && firstOption.Text) {
          return question.options.map((opt: any) => opt.Text);
        }
      }
      
      if (typeof firstOption === 'string') {
        return question.options;
      }
    }
    
    return [];
  }

  isOptionSelected(question: any, option: string): boolean {
    if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
      if (question.userAnswer === 'V' && option === 'Verdadero') return true;
      if (question.userAnswer === 'F' && option === 'Falso') return true;
      return false;
    }
    
    const options = this.getQuestionOptions(question);
    const optionIndex = options.indexOf(option);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.userAnswer === letter;
    }
    
    return false;
  }

  isOptionCorrect(question: any, option: string): boolean {
    if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
      const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
      const isVerdaderoCorrect = correctAnswerNorm === 'true' || 
                                  correctAnswerNorm === 'v' || 
                                  correctAnswerNorm === 'verdadero';
      
      if (option === 'Verdadero' && isVerdaderoCorrect) return true;
      if (option === 'Falso' && !isVerdaderoCorrect) return true;
      return false;
    }
    
    const options = this.getQuestionOptions(question);
    const optionIndex = options.indexOf(option);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.correctAnswer.toUpperCase() === letter;
    }
    
    return false;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
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

}