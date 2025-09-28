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
  correctAnswers = 8;
  incorrectAnswers = 2;
  totalQuestions = 10;
  percentage = 80;
  level = 'INTERMEDIO';
  celebrationMessage = '¡Excelente progreso!';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.loadTestResults();
    this.generateQuestionsStatus();
  }

  // Cargar resultados del test desde localStorage
  loadTestResults() {
    try {
      const results = localStorage.getItem('current_test_results');
      if (results) {
        this.testResults = JSON.parse(results);
        
        // Actualizar datos con los resultados reales
        this.correctAnswers = this.testResults.correctAnswers || 8;
        this.totalQuestions = this.testResults.totalQuestions || 10;
        this.incorrectAnswers = this.totalQuestions - this.correctAnswers;
        this.percentage = this.testResults.percentage || 80;
        this.level = this.testResults.level || 'INTERMEDIO';
        
        console.log('Resultados cargados:', this.testResults);
      } else {
        // Datos de ejemplo si no hay resultados guardados
        console.log('No hay resultados guardados, usando datos de ejemplo');
      }
    } catch (error) {
      console.error('Error cargando resultados:', error);
    }
  }

  // Generar el estado de cada pregunta para los círculos
  generateQuestionsStatus() {
    this.questionsStatus = [];
    
    // Si tenemos resultados detallados, usarlos
    if (this.testResults && this.testResults.incorrectQuestions) {
      const incorrectQuestionNumbers = this.testResults.incorrectQuestions.map((q: any) => q.number);
      
      for (let i = 1; i <= this.totalQuestions; i++) {
        this.questionsStatus.push({
          questionNumber: i,
          isCorrect: !incorrectQuestionNumbers.includes(i)
        });
      }
    } else {
      // Generar estado basado en correctas/incorrectas
      for (let i = 1; i <= this.totalQuestions; i++) {
        this.questionsStatus.push({
          questionNumber: i,
          isCorrect: i <= this.correctAnswers // Primeras X son correctas
        });
      }
    }
    
    console.log('Estado de preguntas generado:', this.questionsStatus);
  }

  // Ver respuestas incorrectas
  reviewIncorrect() {
    console.log('Revisando respuestas incorrectas...');
    // TODO: Implementar vista detallada de respuestas incorrectas
    // Podría ser una nueva página o un modal
  }

  // Hacer nuevo test
  takeNewTest() {
    console.log('Iniciando nuevo test...');
    
    // Limpiar resultados anteriores
    localStorage.removeItem('current_test_results');
    
    // Navegar de vuelta a civil-escrito para empezar un nuevo test
    this.router.navigate(['/civil/civil-escrito']);
  }

  // Volver al inicio
  goBack() {
    console.log('Volviendo al inicio...');
    
    // Limpiar resultados
    localStorage.removeItem('current_test_results');
    
    // Navegar al inicio de civil
    this.router.navigate(['/civil/civil-escrito']);
  }
}