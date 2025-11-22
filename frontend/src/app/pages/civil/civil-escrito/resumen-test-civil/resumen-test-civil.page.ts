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
  selector: 'app-resumen-test-civil',
  templateUrl: './resumen-test-civil.page.html',
  styleUrls: ['./resumen-test-civil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0 })),
      ]),
    ]),
  ],
})
export class ResumenTestCivilPage implements OnInit {
  // Variables de resultados
  correctAnswers = 0;
  incorrectAnswers = 0;
  totalQuestions = 5;
  percentage = 0;

  // Variables de motivación
  motivationalMessage = '¡Sigue practicando!';

  // Resultados detallados de preguntas
  questionResults: QuestionResult[] = [];
  incorrectQuestions: any[] = [];

  // Control del desplegable
  expandedQuestionIndex: number | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    try {
      const resultsString = localStorage.getItem('current_test_results');

      if (!resultsString) {
        console.warn('No hay resultados guardados');
        this.router.navigate(['/civil/civil-escrito']);
        return;
      }

      const results = JSON.parse(resultsString);
      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.totalQuestions = results.totalQuestions || 5;
      this.percentage = results.percentage || 0;
      this.incorrectQuestions = results.incorrectQuestions || [];

      // ✅ Usar allQuestions si está disponible
      if (results.allQuestions && results.allQuestions.length > 0) {
        this.questionResults = results.allQuestions;
      } else {
        // Método antiguo (compatibilidad)
        this.questionResults = [];
        for (let i = 0; i < this.totalQuestions; i++) {
          const incorrectQuestion = this.incorrectQuestions.find(
            (q) => q.questionNumber === i + 1
          );
          this.questionResults.push({
            questionNumber: i + 1,
            questionText:
              incorrectQuestion?.questionText ||
              'Pregunta respondida correctamente',
            userAnswer: incorrectQuestion?.userAnswer || '',
            correctAnswer: incorrectQuestion?.correctAnswer || '',
            explanation: incorrectQuestion?.explanation || '',
            isCorrect: !incorrectQuestion,
          });
        }
      }

      this.setMotivationalMessage();
    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.router.navigate(['/civil/civil-escrito']);
    }
  }

  // ✅ Mensaje motivacional según porcentaje
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

  // ✅ Toggle pregunta (desplegable)
  toggleQuestion(index: number) {
    this.expandedQuestionIndex =
      this.expandedQuestionIndex === index ? null : index;
  }

  // ✅ Ver respuestas incorrectas (redirige a reforzar)
  reviewIncorrect() {
    localStorage.setItem(
      'questions_to_review',
      JSON.stringify(this.incorrectQuestions)
    );
    this.router.navigate(['/civil/civil-reforzar']);
  }

  // ✅ Hacer nuevo test
  takeNewTest() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil/civil-escrito']);
  }

  // ✅ Volver a Civil
  goBack() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil']);
  }

  // ✅ Volver al Home
  goToHome() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/dashboard']);
  }

  // ✅ Obtener opciones de la pregunta
  getQuestionOptions(question: any): string[] {
    if (
      question.type === 'verdadero_falso' ||
      question.type === 2 ||
      question.type === '2'
    ) {
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

  // ✅ Mensaje pequeño según resultado
  getSmallMessage(): string {
    if (this.percentage >= 90) return '¡Increíble!';
    if (this.percentage >= 80) return '¡Excelente trabajo!';
    if (this.percentage >= 70) return '¡Muy bien!';
    if (this.percentage >= 60) return 'Buen intento';
    if (this.percentage >= 40) return 'Sigue adelante';
    return 'No te rindas';
  }

  // ✅ Mensaje grande según resultado
  getLargeMessage(): string {
    if (this.percentage >= 90) return '¡Dominas el tema!';
    if (this.percentage >= 80) return '¡Vas por buen camino!';
    if (this.percentage >= 70) return '¡Sigue así!';
    if (this.percentage >= 60) return '¡Puedes mejorar!';
    if (this.percentage >= 40) return '¡Sigue practicando!';
    return '¡Inténtalo de nuevo!';
  }

  // ✅ Verificar si una opción fue seleccionada
  isOptionSelected(question: any, option: string): boolean {
    if (
      question.type === 'verdadero_falso' ||
      question.type === 2 ||
      question.type === '2'
    ) {
      // userAnswer viene como "A" o "B" desde el test
      if (question.userAnswer === 'A' && option === 'Verdadero') return true;
      if (question.userAnswer === 'B' && option === 'Falso') return true;
      
      // Compatibilidad con formato antiguo (V/F)
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

  // ✅ Verificar si una opción es la correcta
  isOptionCorrect(question: any, option: string): boolean {
    if (
      question.type === 'verdadero_falso' ||
      question.type === 2 ||
      question.type === '2'
    ) {
      const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
      const isVerdaderoCorrect =
        correctAnswerNorm === 'true' ||
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

  // ✅ Obtener letra de la opción
  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
