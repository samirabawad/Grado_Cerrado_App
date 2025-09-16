import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

interface Question {
  id: number;
  category: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
  correctAnswer: string;
  userAnswer?: string;
}

@Component({
  selector: 'app-test-escrito-civil',
  templateUrl: './test-escrito-civil.page.html',
  styleUrls: ['./test-escrito-civil.page.scss'],
  standalone: false
})
export class TestEscritoCivilPage implements OnInit, OnDestroy {

  // Configuración del test
  testConfig = {
    numberOfQuestions: 10,
    difficulty: 'Intermedio',
    adaptiveMode: true,
    immediateFeedback: false,
    onlyFailedQuestions: false,
    timeLimit: 25
  };

  // Estado del test
  currentQuestionIndex = 0;
  questions: Question[] = [];
  selectedAnswer: string = '';
  timeRemaining = 0;
  timer: any;
  isTestCompleted = false;

  // Datos de progreso
  totalQuestions = 10;
  currentQuestionNumber = 1;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Obtener configuración desde los parámetros
    this.route.queryParams.subscribe(params => {
      if (params['numberOfQuestions']) {
        this.testConfig.numberOfQuestions = parseInt(params['numberOfQuestions']);
        this.totalQuestions = this.testConfig.numberOfQuestions;
      }
      if (params['difficulty']) {
        this.testConfig.difficulty = params['difficulty'];
      }
      if (params['timeLimit']) {
        this.testConfig.timeLimit = parseInt(params['timeLimit']);
        this.timeRemaining = this.testConfig.timeLimit * 60; // Convertir a segundos
      }
    });

    // Generar preguntas simuladas
    this.generateQuestions();
    
    // Iniciar timer
    this.startTimer();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // Generar preguntas simuladas basadas en la imagen
  generateQuestions() {
    const sampleQuestions: Question[] = [
      {
        id: 1,
        category: 'Contratos',
        text: '¿Cuál es la diferencia fundamental entre un contrato bilateral y un contrato unilateral según el Código Civil chileno?',
        options: [
          { id: 'A', text: 'En el contrato bilateral solo una parte se obliga hacia la otra' },
          { id: 'B', text: 'No existe diferencia legal entre ambos tipos de contratos' },
          { id: 'C', text: 'En el bilateral ambas partes se obligan recíprocamente, en el unilateral solo una parte se obliga' },
          { id: 'D', text: 'El contrato bilateral es más complejo que el unilateral en términos procedimentales' }
        ],
        correctAnswer: 'C'
      },
      {
        id: 2,
        category: 'Obligaciones',
        text: '¿Qué caracteriza a las obligaciones de dar en el derecho civil chileno?',
        options: [
          { id: 'A', text: 'Solo pueden referirse a bienes muebles' },
          { id: 'B', text: 'Implican la transferencia del dominio o constitución de un derecho real' },
          { id: 'C', text: 'No requieren tradición para su cumplimiento' },
          { id: 'D', text: 'Son siempre de plazo indefinido' }
        ],
        correctAnswer: 'B'
      },
      {
        id: 3,
        category: 'Derechos Reales',
        text: '¿Cuál es el efecto principal de la inscripción conservatoria en los bienes raíces?',
        options: [
          { id: 'A', text: 'Solo sirve como medio de publicidad' },
          { id: 'B', text: 'Es requisito para la tradición del dominio' },
          { id: 'C', text: 'No tiene efectos jurídicos relevantes' },
          { id: 'D', text: 'Solo es necesaria para bienes de alto valor' }
        ],
        correctAnswer: 'B'
      }
      // Agregar más preguntas según sea necesario
    ];

    // Tomar solo el número de preguntas configurado
    this.questions = sampleQuestions.slice(0, this.testConfig.numberOfQuestions);
    this.currentQuestionNumber = 1;
  }

  // Iniciar el temporizador
  startTimer() {
    this.timer = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.finishTest();
      }
    }, 1000);
  }

  // Formatear tiempo restante
  getFormattedTime(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Obtener pregunta actual
  getCurrentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  // Seleccionar respuesta
  selectAnswer(optionId: string) {
    this.selectedAnswer = optionId;
    this.questions[this.currentQuestionIndex].userAnswer = optionId;
  }

  // Verificar si hay respuesta seleccionada
  hasSelectedAnswer(): boolean {
    return this.selectedAnswer !== '';
  }

  // Siguiente pregunta
  nextQuestion() {
    if (!this.hasSelectedAnswer()) {
      return;
    }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestionNumber++;
      this.selectedAnswer = this.questions[this.currentQuestionIndex].userAnswer || '';
    } else {
      this.finishTest();
    }
  }

  // Finalizar test
  finishTest() {
    this.isTestCompleted = true;
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Calcular resultados
    const correctAnswers = this.questions.filter(q => q.userAnswer === q.correctAnswer).length;
    const percentage = Math.round((correctAnswers / this.questions.length) * 100);

    // Navegar a la página de resultados
    this.router.navigate(['/civil/civil-escrito/resultados'], {
      queryParams: {
        correctAnswers,
        totalQuestions: this.questions.length,
        percentage,
        timeUsed: this.testConfig.timeLimit * 60 - this.timeRemaining
      }
    });
  }

  // Obtener progreso
  getProgress(): number {
    return (this.currentQuestionNumber / this.totalQuestions) * 100;
  }

  // Obtener color de la categoría
  getCategoryColor(): string {
    const category = this.getCurrentQuestion()?.category;
    switch (category) {
      case 'Contratos':
        return '#4CAF50';
      case 'Obligaciones':
        return '#2196F3';
      case 'Derechos Reales':
        return '#FF9800';
      default:
        return '#9C27B0';
    }
  }

  // Verificar si una opción está seleccionada
  isOptionSelected(optionId: string): boolean {
    return this.selectedAnswer === optionId;
  }

  // Salir del test
  exitTest() {
    if (confirm('¿Estás seguro de que quieres salir del test? Se perderá tu progreso.')) {
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.router.navigate(['/civil/civil-escrito']);
    }
  }
}