import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

interface QuestionDetail {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  expectedAnswer: string;
  explanation: string;
  correct: boolean;
  options?: string[];
}

@Component({
  selector: 'app-resumen-test-procesal-oral',
  templateUrl: './resumen-test-procesal-oral.page.html',
  styleUrls: ['./resumen-test-procesal-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ResumenTestProcesalOralPage implements OnInit {
  
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  motivationalMessage: string = '¡Sigue practicando!';
  
  questionsDetails: QuestionDetail[] = [];
  expandedQuestionIndex: number | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    try {
      const resultsString = localStorage.getItem('current_oral_test_results');
      
      if (!resultsString) {
        console.warn('No hay resultados guardados');
        this.router.navigate(['/procesal/procesal-oral']);
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

      this.setMotivationalMessage();

    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.router.navigate(['/procesal/procesal-oral']);
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

  reviewIncorrect() {
    const incorrectQuestions = this.questionsDetails.filter(q => !q.correct);
    localStorage.setItem('questions_to_review', JSON.stringify(incorrectQuestions));
    this.router.navigate(['/procesal/procesal-reforzar']);
  }

  takeNewTest() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/procesal/procesal-oral']);
  }

  goBack() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/procesal']);
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  getOptionText(option: any): string {
    if (typeof option === 'string') {
      return option;
    }
    if (typeof option === 'object' && option !== null) {
      return option.texto || option.text || option.option || String(option);
    }
    return String(option);
  }

  isOptionSelected(question: QuestionDetail, optionText: string): boolean {
    if (!question.userAnswer || !question.options) return false;
    
    const options = question.options.map(opt => this.getOptionText(opt));
    const index = options.indexOf(optionText);
    
    if (index === -1) return false;
    
    const expectedLetter = String.fromCharCode(65 + index);
    return question.userAnswer.toUpperCase() === expectedLetter;
  }

  isOptionCorrect(question: QuestionDetail, optionText: string): boolean {
    if (!question.expectedAnswer || !question.options) return false;
    
    const options = question.options.map(opt => this.getOptionText(opt));
    const index = options.indexOf(optionText);
    
    if (index === -1) return false;
    
    const correctLetter = String.fromCharCode(65 + index);
    return question.expectedAnswer.toUpperCase() === correctLetter;
  }

  getCorrectAnswerText(question: QuestionDetail): string {
    // Si hay opciones, convertir la letra a texto
    if (question.options && question.options.length > 0) {
      const correctAnswer = question.expectedAnswer?.toUpperCase().trim();
      
      // Buscar por letra (A, B, C, D)
      const letterMatch = correctAnswer?.match(/^[A-D]$/);
      if (letterMatch) {
        const index = correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (index >= 0 && index < question.options.length) {
          const optionText = this.getOptionText(question.options[index]);
          return `${correctAnswer}. ${optionText}`;
        }
      }
      
      // Si es V/F
      if (correctAnswer === 'V' || correctAnswer === 'VERDADERO') {
        return 'A. Verdadero';
      }
      if (correctAnswer === 'F' || correctAnswer === 'FALSO') {
        return 'B. Falso';
      }
    }
    
    // Si no hay opciones, devolver tal cual
    return question.expectedAnswer || '';
  }
}