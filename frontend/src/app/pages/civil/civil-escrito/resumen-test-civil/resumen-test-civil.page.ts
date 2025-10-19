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
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class ResumenTestCivilPage implements OnInit {
  
  // Variables de resultados
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  // Variables de nivel y motivación
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';
  motivationalMessage: string = '¡Sigue practicando!';
  
  // Resultados detallados de preguntas
  questionResults: QuestionResult[] = [];
  incorrectQuestions: any[] = [];

  // Control del desplegable
  expandedQuestionIndex: number | null = null;

  constructor(
    private router: Router
  ) { }

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

    // ✅ USAR allQuestions si está disponible, sino usar el método anterior
    if (results.allQuestions && results.allQuestions.length > 0) {
      this.questionResults = results.allQuestions;
    } else {
      // Método antiguo (para compatibilidad)
      this.questionResults = [];
      for (let i = 0; i < this.totalQuestions; i++) {
        const incorrectQuestion = this.incorrectQuestions.find(q => q.questionNumber === i + 1);
        this.questionResults.push({
          questionNumber: i + 1,
          questionText: incorrectQuestion?.questionText || 'Pregunta respondida correctamente',
          userAnswer: incorrectQuestion?.userAnswer || '',
          correctAnswer: incorrectQuestion?.correctAnswer || '',
          explanation: incorrectQuestion?.explanation || '',
          isCorrect: !incorrectQuestion
        });
      }
    }

    this.calculateLevel();
    this.setMotivationalMessage();

  } catch (error) {
    console.error('Error cargando resultados:', error);
    this.router.navigate(['/civil/civil-escrito']);
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

  // ✅ MENSAJE MOTIVACIONAL SEGÚN PORCENTAJE
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

  // ✅ TOGGLE PREGUNTA (DESPLEGABLE)
  toggleQuestion(index: number) {
    // Si ya está expandida, la cerramos
    if (this.expandedQuestionIndex === index) {
      this.expandedQuestionIndex = null;
    } else {
      // Si no, abrimos esta y cerramos cualquier otra
      this.expandedQuestionIndex = index;
    }
  }

  // ✅ VER RESPUESTAS INCORRECTAS (REDIRIGE A REFORZAR)
  reviewIncorrect() {
    // Guardar las preguntas incorrectas para reforzar
    localStorage.setItem('questions_to_review', JSON.stringify(this.incorrectQuestions));
    
    // Navegar a la sección de reforzar
    this.router.navigate(['/civil/civil-reforzar']);
  }

  // ✅ HACER NUEVO TEST
  takeNewTest() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil/civil-escrito']);
  }

  // ✅ VOLVER A CIVIL
  goBack() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil/civil-escrito']);
  }

  // ✅ VOLVER AL HOME
  goToHome() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/dashboard']);
  }

  // ✅ Obtener opciones de la pregunta
getQuestionOptions(question: any): string[] {
  // Para Verdadero/Falso
  if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
    return ['Verdadero', 'Falso'];
  }
  
  // Para selección múltiple
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

// ✅ Verificar si una opción fue seleccionada
isOptionSelected(question: any, option: string): boolean {
  // Verdadero/Falso
  if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
    if (question.userAnswer === 'V' && option === 'Verdadero') return true;
    if (question.userAnswer === 'F' && option === 'Falso') return true;
    return false;
  }
  
  // Selección múltiple
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
  // Verdadero/Falso
  if (question.type === 'verdadero_falso' || question.type === 2 || question.type === '2') {
    const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
    const isVerdaderoCorrect = correctAnswerNorm === 'true' || 
                                correctAnswerNorm === 'v' || 
                                correctAnswerNorm === 'verdadero';
    
    if (option === 'Verdadero' && isVerdaderoCorrect) return true;
    if (option === 'Falso' && !isVerdaderoCorrect) return true;
    return false;
  }
  
  // Selección múltiple
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