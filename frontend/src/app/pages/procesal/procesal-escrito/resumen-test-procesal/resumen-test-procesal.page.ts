import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { trigger, transition, style, animate } from '@angular/animations';

// ----------------------
// Tipos/Interfaces
// ----------------------
type QuestionType = 'verdadero_falso' | string | number;

interface OptionObj {
  text?: string;   // { text: '...' }
  Text?: string;   // { Text: '...' }
}

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  userAnswer: string;    // 'A' | 'B' | 'V' | 'F' | etc.
  correctAnswer: string; // 'A' | 'B' | 'true' | 'v' | etc.
  explanation: string;
  isCorrect: boolean;
  options?: Array<OptionObj | string>;
  type?: QuestionType;
}

interface StoredResults {
  correctAnswers?: number;
  incorrectAnswers?: number;
  totalQuestions?: number;
  percentage?: number;
  incorrectQuestions?: QuestionResult[];
  allQuestions?: QuestionResult[];
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

  // Totales
  correctAnswers = 0;
  incorrectAnswers = 0;
  totalQuestions = 5;
  percentage = 0;

  // Mensaje motivacional
  motivationalMessage = '¡Sigue practicando!';

  // Listados
  questionResults: QuestionResult[] = [];
  incorrectQuestions: QuestionResult[] = [];

  // Control del desplegable
  expandedQuestionIndex: number | null = null;

  private readonly LS_RESULTS_KEY = 'current_test_results';
  private readonly LS_REVIEW_KEY = 'questions_to_review';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadResults();
  }

  // ----------------------
  // Carga y normalización
  // ----------------------
  loadResults(): void {
    try {
      const resultsString = localStorage.getItem(this.LS_RESULTS_KEY);

      if (!resultsString) {
        console.warn('No hay resultados guardados');
        this.router.navigate(['/procesal/procesal-escrito']);
        return;
      }

      const results: StoredResults = JSON.parse(resultsString);

      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers ?? 0;
      this.incorrectAnswers = results.incorrectAnswers ?? 0;
      this.totalQuestions = results.totalQuestions ?? 5;
      this.percentage = results.percentage ?? 0;
      this.incorrectQuestions = results.incorrectQuestions ?? [];

      // Usar allQuestions si existe; si no, construir lista compatible
      if (Array.isArray(results.allQuestions) && results.allQuestions.length > 0) {
        this.questionResults = results.allQuestions;
      } else {
        this.questionResults = [];
        for (let i = 0; i < this.totalQuestions; i++) {
          const num = i + 1;
          const incorrect = this.incorrectQuestions.find(q => q.questionNumber === num);
          this.questionResults.push({
            questionNumber: num,
            questionText: incorrect?.questionText ?? 'Pregunta respondida correctamente',
            userAnswer: incorrect?.userAnswer ?? '',
            correctAnswer: incorrect?.correctAnswer ?? '',
            explanation: incorrect?.explanation ?? '',
            isCorrect: !incorrect,
            options: incorrect?.options,
            type: incorrect?.type
          });
        }
      }

      this.setMotivationalMessage();
    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.router.navigate(['/procesal/procesal-escrito']);
    }
  }

  // ----------------------
  // Mensajes motivacionales
  // ----------------------
  setMotivationalMessage(): void {
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

  getSmallMessage(): string {
    if (this.percentage >= 90) return '¡Increíble!';
    if (this.percentage >= 80) return '¡Excelente trabajo!';
    if (this.percentage >= 70) return '¡Muy bien!';
    if (this.percentage >= 60) return 'Buen intento';
    if (this.percentage >= 40) return 'Sigue adelante';
    return 'No te rindas';
    }

  getLargeMessage(): string {
    if (this.percentage >= 90) return '¡Dominas el tema!';
    if (this.percentage >= 80) return '¡Vas por buen camino!';
    if (this.percentage >= 70) return '¡Sigue así!';
    if (this.percentage >= 60) return '¡Puedes mejorar!';
    if (this.percentage >= 40) return '¡Sigue practicando!';
    return '¡Inténtalo de nuevo!';
  }

  // ----------------------
  // Desplegable por pregunta
  // ----------------------
  toggleQuestion(index: number): void {
    this.expandedQuestionIndex = this.expandedQuestionIndex === index ? null : index;
  }

  // ----------------------
  // Navegación
  // ----------------------
  reviewIncorrect(): void {
    localStorage.setItem(this.LS_REVIEW_KEY, JSON.stringify(this.incorrectQuestions ?? []));
    this.router.navigate(['/procesal/procesal-reforzar']);
  }

  takeNewTest(): void {
    localStorage.removeItem(this.LS_RESULTS_KEY);
    this.router.navigate(['/procesal/procesal-escrito']);
  }

  goBack(): void {
    localStorage.removeItem(this.LS_RESULTS_KEY);
    this.router.navigate(['/procesal']);
  }

  goToHome(): void {
    localStorage.removeItem(this.LS_RESULTS_KEY);
    this.router.navigate(['/dashboard']);
  }

  // ----------------------
  // Helpers de preguntas/opciones
  // ----------------------
  getQuestionOptions(question: QuestionResult): string[] {
    // Verdadero / Falso
    if (this.isTrueFalse(question.type)) {
      return ['Verdadero', 'Falso'];
    }

    // Selección múltiple
    const opts = question.options ?? [];
    if (opts.length === 0) return [];

    const first = opts[0];
    // Objetos con { text } o { Text }
    if (typeof first === 'object' && first !== null) {
      if ('text' in first && (first as OptionObj).text) {
        return (opts as OptionObj[]).map(o => o.text ?? '');
      }
      if ('Text' in first && (first as OptionObj).Text) {
        return (opts as OptionObj[]).map(o => o.Text ?? '');
      }
    }
    // Strings directos
    if (typeof first === 'string') {
      return opts as string[];
    }

    return [];
  }

  isOptionSelected(question: QuestionResult, option: string): boolean {
    // Verdadero / Falso
    if (this.isTrueFalse(question.type)) {
      const ua = this.normTF(question.userAnswer);
      return (option === 'Verdadero' && ua === true) || (option === 'Falso' && ua === false);
    }

    // Selección múltiple por letra
    const options = this.getQuestionOptions(question);
    const optionIndex = options.indexOf(option);
    if (optionIndex === -1) return false;

    const expectedLetter = this.getOptionLetter(optionIndex);
    return (question.userAnswer ?? '').toUpperCase().trim() === expectedLetter;
  }

  isOptionCorrect(question: QuestionResult, option: string): boolean {
    // Verdadero / Falso
    if (this.isTrueFalse(question.type)) {
      const ca = this.normTF(question.correctAnswer);
      if (ca === null) return false; // no interpretable
      return (option === 'Verdadero' && ca === true) || (option === 'Falso' && ca === false);
    }

    // Selección múltiple por letra
    const options = this.getQuestionOptions(question);
    const optionIndex = options.indexOf(option);
    if (optionIndex === -1) return false;

    const expectedLetter = this.getOptionLetter(optionIndex);
    return (question.correctAnswer ?? '').toUpperCase().trim() === expectedLetter;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // 0 -> 'A'
  }

  // ----------------------
  // Normalizadores
  // ----------------------
  private isTrueFalse(type: QuestionType | undefined): boolean {
    return (
      type === 'verdadero_falso' ||
      type === 2 ||
      type === '2'
    );
  }

  /**
   * Normaliza valores de V/F:
   * - true/verdadero/v -> true
   * - false/falso/f    -> false
   * - otro/no interpretable -> null
   */
  private normTF(value: string | undefined | null): boolean | null {
    const v = (value ?? '').toString().trim().toLowerCase();
    if (['true', 'v', 'verdadero', 't', '1', 'sí', 'si'].includes(v)) return true;
    if (['false', 'f', 'falso', '0', 'no'].includes(v)) return false;
    return null;
  }
}
