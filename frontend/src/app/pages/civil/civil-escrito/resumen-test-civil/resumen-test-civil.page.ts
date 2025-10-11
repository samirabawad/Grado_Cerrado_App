import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

interface QuestionResult {
  questionNumber: number;
  isCorrect: boolean;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}

@Component({
  selector: 'app-resumen-test-civil',
  templateUrl: './resumen-test-civil.page.html',
  styleUrls: ['./resumen-test-civil.page.scss'],
  standalone: false
})
export class ResumenTestCivilPage implements OnInit {

  // Datos de los resultados
  testResults: any = null;
  questionsStatus: QuestionResult[] = [];
  
  // Datos calculados para mostrar
  correctAnswers = 0;
  incorrectAnswers = 0;
  totalQuestions = 0;
  percentage = 0;
  
  // Variables de nivel (igual que en oral)
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.loadTestResults();
    this.generateQuestionsStatus();
    this.setLevelInfo();
  }

  // Cargar resultados del test desde localStorage
  loadTestResults() {
    try {
      const results = localStorage.getItem('current_test_results');
      if (results) {
        this.testResults = JSON.parse(results);
        
        this.correctAnswers = this.testResults.correctAnswers || 0;
        this.totalQuestions = this.testResults.totalQuestions || 0;
        this.incorrectAnswers = this.testResults.incorrectAnswers || (this.totalQuestions - this.correctAnswers);
        this.percentage = this.testResults.percentage || 0;
        
        console.log('Resultados cargados:', this.testResults);
        console.log('Datos para mostrar:', {
          correctas: this.correctAnswers,
          incorrectas: this.incorrectAnswers,
          total: this.totalQuestions,
          porcentaje: this.percentage
        });
      } else {
        console.log('No hay resultados guardados, usando datos de ejemplo');
        this.correctAnswers = 0;
        this.incorrectAnswers = 5;
        this.totalQuestions = 5;
        this.percentage = 0;
      }
    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.correctAnswers = 0;
      this.incorrectAnswers = 5;
      this.totalQuestions = 5;
      this.percentage = 0;
    }
  }

  // Generar el estado de cada pregunta para los círculos
  generateQuestionsStatus() {
    this.questionsStatus = [];
    
    if (this.testResults && this.testResults.allQuestions) {
      this.questionsStatus = this.testResults.allQuestions.map((q: any) => ({
        questionNumber: q.questionNumber,
        isCorrect: q.isCorrect,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer
      }));
    } else {
      for (let i = 1; i <= this.totalQuestions; i++) {
        this.questionsStatus.push({
          questionNumber: i,
          isCorrect: i <= this.correctAnswers
        });
      }
    }
    
    console.log('Estado de preguntas generado:', this.questionsStatus);
  }

  // Determinar nivel según porcentaje (IGUAL QUE EN ORAL)
  setLevelInfo() {
    if (this.percentage >= 80) {
      this.levelTitle = 'NIVEL AVANZADO';
      this.levelSubtitle = '¡Excelente dominio!';
    } else if (this.percentage >= 60) {
      this.levelTitle = 'NIVEL INTERMEDIO';
      this.levelSubtitle = '¡Excelente progreso!';
    } else {
      this.levelTitle = 'NIVEL PRINCIPIANTE';
      this.levelSubtitle = '¡Sigue practicando!';
    }
  }

  // Ver respuestas incorrectas
  reviewIncorrect() {
    console.log('Revisando respuestas incorrectas...');
  }

  // Hacer nuevo test
  takeNewTest() {
    console.log('Iniciando nuevo test...');
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil/civil-escrito']);
  }

  // Volver al inicio
  goBack() {
    console.log('Volviendo al inicio...');
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/civil/civil-escrito']);
  }
}