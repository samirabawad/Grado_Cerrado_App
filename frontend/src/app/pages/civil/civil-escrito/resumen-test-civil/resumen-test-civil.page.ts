// INICIO DEL ARCHIVO - Copiar desde aquí
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
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
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
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
}