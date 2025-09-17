import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../services/api.service'; // Ajusta la ruta según tu estructura

interface Question {
  id: string; // Cambié a string para compatibilidad con backend
  text: string; // Mantener 'text' para compatibilidad con template
  questionText: string; // También mantener questionText para backend
  type: number; // QuestionType del backend
  category: string; // Agregar category para template
  options: {
    id: string;
    text: string;
  }[]; // Mantener formato de opciones del template original
  correctAnswer: string;
  explanation: string;
  legalArea: string;
  difficulty: number;
  userAnswer?: string;
}

interface BackendSession {
  session: any;
  questions: any[];
  currentQuestionIndex: number;
  totalQuestions: number;
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
  isLoading = true;
  loadingError = false;

  // Datos de progreso
  totalQuestions = 10;
  currentQuestionNumber = 1;

  // Datos de la sesión del backend
  currentSession: BackendSession | null = null;
  sessionId: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService // ✅ Inyectar ApiService
  ) { }

  ngOnInit() {
    this.loadSessionFromBackend();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // ✅ CARGAR SESIÓN DESDE EL BACKEND
  async loadSessionFromBackend() {
    try {
      this.isLoading = true;
      
      // Obtener la sesión actual del ApiService
      this.currentSession = this.apiService.getCurrentSession();
      
      if (!this.currentSession) {
        console.error('No hay sesión activa');
        this.loadingError = true;
        this.router.navigate(['/civil/civil-escrito/configuracion']);
        return;
      }

      console.log('Sesión cargada:', this.currentSession);
      
      // Configurar datos del test desde la sesión
      this.sessionId = this.currentSession.session.id;
      this.totalQuestions = this.currentSession.totalQuestions;
      this.currentQuestionIndex = this.currentSession.currentQuestionIndex;
      this.currentQuestionNumber = this.currentQuestionIndex + 1;
      
      // Convertir preguntas del backend al formato del frontend
      this.questions = this.convertBackendQuestions(this.currentSession.questions);
      
      console.log('Preguntas convertidas:', this.questions);
      
      // Configurar timer (usar valor por defecto si no viene en la sesión)
      this.timeRemaining = this.testConfig.timeLimit * 60; // 25 minutos por defecto
      
      this.isLoading = false;
      this.startTimer();
      
    } catch (error) {
      console.error('Error cargando sesión:', error);
      this.loadingError = true;
      this.isLoading = false;
    }
  }

  // ✅ CONVERTIR PREGUNTAS DEL BACKEND AL FORMATO DEL FRONTEND
  convertBackendQuestions(backendQuestions: any[]): Question[] {
    return backendQuestions.map(bq => {
      // Generar opciones para preguntas de opción múltiple
      let options: { id: string; text: string; }[] = [];
      
      if (bq.type === 0) { // MultipleChoice
        // Si el backend no envía opciones, las generamos basadas en la respuesta correcta
        options = this.generateOptionsForQuestion(bq);
      }

      return {
        id: bq.id,
        text: bq.questionText, // Usar questionText del backend como text para el template
        questionText: bq.questionText,
        type: bq.type,
        category: bq.legalArea || 'Derecho Civil', // Usar legalArea como category
        options: options,
        correctAnswer: bq.correctAnswer,
        explanation: bq.explanation || '',
        legalArea: bq.legalArea || 'Derecho Civil',
        difficulty: bq.difficulty || 1,
        userAnswer: undefined
      };
    });
  }

  // ✅ GENERAR OPCIONES PARA PREGUNTAS (si no vienen del backend)
  generateOptionsForQuestion(question: any): { id: string; text: string; }[] {
    // Si el backend ya envía opciones en el formato correcto, usarlas
    if (question.options && question.options.length > 0) {
      // Si las opciones ya vienen con id y text
      if (typeof question.options[0] === 'object' && question.options[0].id) {
        return question.options;
      }
      
      // Si las opciones son solo strings, convertirlas
      return question.options.map((opt: string, index: number) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D
        text: opt
      }));
    }

    // Si no, generar opciones básicas (esto deberías mejorarlo según tu lógica)
    return [
      { id: 'A', text: question.correctAnswer },
      { id: 'B', text: 'Opción alternativa 1' },
      { id: 'C', text: 'Opción alternativa 2' }, 
      { id: 'D', text: 'Opción alternativa 3' }
    ];
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
  getCurrentQuestion(): Question | null {
    if (this.questions.length === 0 || this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  // Seleccionar respuesta
  selectAnswer(optionId: string) {
    this.selectedAnswer = optionId;
    if (this.questions[this.currentQuestionIndex]) {
      this.questions[this.currentQuestionIndex].userAnswer = optionId;
    }
  }

  // Verificar si hay respuesta seleccionada
  hasSelectedAnswer(): boolean {
    return this.selectedAnswer !== '';
  }

  // ✅ SIGUIENTE PREGUNTA (actualizada para enviar respuesta al backend)
  async nextQuestion() {
    if (!this.hasSelectedAnswer()) {
      return;
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    try {
      // Enviar respuesta al backend
      const answerData = {
        questionId: currentQuestion.id,
        userAnswer: this.selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        questionType: currentQuestion.type,
        timeSpentSeconds: 30, // Puedes calcular el tiempo real
        generateFollowUp: false,
        originalQuestionText: currentQuestion.questionText,
        legalArea: currentQuestion.legalArea,
        difficulty: currentQuestion.difficulty
      };

      const response = await this.apiService.answerQuestion(answerData).toPromise();
      console.log('Respuesta enviada al backend:', response);

    } catch (error) {
      console.error('Error enviando respuesta:', error);
      // Continuar aunque falle el envío al backend
    }

    // Avanzar a la siguiente pregunta
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestionNumber++;
      this.selectedAnswer = this.questions[this.currentQuestionIndex].userAnswer || '';
      
      // Actualizar índice en el servicio
      this.apiService.updateCurrentQuestionIndex(this.currentQuestionIndex);
    } else {
      this.finishTest();
    }
  }

  // ✅ FINALIZAR TEST (actualizado para limpiar sesión)
  finishTest() {
    this.isTestCompleted = true;
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Calcular resultados
    const correctAnswers = this.questions.filter(q => q.userAnswer === q.correctAnswer).length;
    const percentage = Math.round((correctAnswers / this.questions.length) * 100);

    // Limpiar sesión del servicio
    this.apiService.clearCurrentSession();

    // Navegar a la página de resultados
    this.router.navigate(['/civil/civil-escrito/resultados'], {
      queryParams: {
        correctAnswers,
        totalQuestions: this.questions.length,
        percentage,
        timeUsed: this.testConfig.timeLimit * 60 - this.timeRemaining,
        sessionId: this.sessionId
      }
    });
  }

  // Obtener progreso
  getProgress(): number {
    return (this.currentQuestionNumber / this.totalQuestions) * 100;
  }

  // Obtener color de la categoría
  getCategoryColor(): string {
    const question = this.getCurrentQuestion();
    if (!question) return '#9C27B0';
    
    // Usar tanto category como legalArea para determinar el color
    const area = question.category || question.legalArea;
    switch (area) {
      case 'Contratos':
        return '#4CAF50';
      case 'Obligaciones':
        return '#2196F3';
      case 'Derechos Reales':
        return '#FF9800';
      case 'Derecho Civil':
        return '#FF6F00';
      case 'Familia':
        return '#E91E63';
      case 'Sucesiones':
        return '#9C27B0';
      default:
        return '#9C27B0';
    }
  }

  // Verificar si una opción está seleccionada
  isOptionSelected(optionId: string): boolean {
    return this.selectedAnswer === optionId;
  }

  // ✅ SALIR DEL TEST (actualizado para limpiar sesión)
  exitTest() {
    if (confirm('¿Estás seguro de que quieres salir del test? Se perderá tu progreso.')) {
      if (this.timer) {
        clearInterval(this.timer);
      }
      
      // Limpiar sesión
      this.apiService.clearCurrentSession();
      
      this.router.navigate(['/civil/civil-escrito']);
    }
  }

  // ✅ MÉTODOS AUXILIARES PARA LA VISTA

  // Verificar si las preguntas están cargando
  isQuestionsLoading(): boolean {
    return this.isLoading;
  }

  // Verificar si hay error de carga
  hasLoadingError(): boolean {
    return this.loadingError;
  }

  // Reintentar carga
  retryLoading() {
    this.loadingError = false;
    this.loadSessionFromBackend();
  }

  // ✅ MÉTODOS AUXILIARES PARA EL TEMPLATE (agregar estos)
  
  // Obtener categoría de forma segura
  getCurrentQuestionCategory(): string {
    const question = this.getCurrentQuestion();
    return question?.category || question?.legalArea || 'Sin categoría';
  }

  // Obtener texto de pregunta de forma segura  
  getCurrentQuestionText(): string {
    const question = this.getCurrentQuestion();
    return question?.text || question?.questionText || '';
  }

  // Obtener opciones de forma segura
  getCurrentQuestionOptions(): { id: string; text: string; }[] {
    const question = this.getCurrentQuestion();
    return question?.options || [];
  }
}