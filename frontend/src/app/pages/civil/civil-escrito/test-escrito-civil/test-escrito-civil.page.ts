import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from '../../../../services/api.service';

interface Question {
  id: string;
  text: string;
  questionText: string;
  type: number;
  category: string;
  options: {
    id: string;
    text: string;
  }[];
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
    private apiService: ApiService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadSessionFromBackend();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // CARGAR SESIÓN DESDE EL BACKEND
  async loadSessionFromBackend() {
    try {
      this.isLoading = true;
      
      this.currentSession = this.apiService.getCurrentSession();
      
      if (!this.currentSession) {
        console.error('No hay sesión activa');
        this.loadingError = true;
        this.router.navigate(['/civil/civil-escrito/configuracion']);
        return;
      }

      console.log('Sesión cargada:', this.currentSession);
      
      this.sessionId = this.currentSession.session.id;
      this.totalQuestions = this.currentSession.totalQuestions;
      this.currentQuestionIndex = this.currentSession.currentQuestionIndex;
      this.currentQuestionNumber = this.currentQuestionIndex + 1;
      
      this.questions = this.convertBackendQuestions(this.currentSession.questions);
      
      console.log('Preguntas convertidas:', this.questions);
      
      this.timeRemaining = this.testConfig.timeLimit * 60;
      
      this.isLoading = false;
      this.startTimer();
      
    } catch (error) {
      console.error('Error cargando sesión:', error);
      this.loadingError = true;
      this.isLoading = false;
    }
  }

  // CONVERTIR PREGUNTAS DEL BACKEND AL FORMATO DEL FRONTEND
  convertBackendQuestions(backendQuestions: any[]): Question[] {
    return backendQuestions.map(bq => {
      let options: { id: string; text: string; }[] = [];
      
      if (bq.type === 0) {
        options = this.generateOptionsForQuestion(bq);
      }

      return {
        id: bq.id,
        text: bq.questionText,
        questionText: bq.questionText,
        type: bq.type,
        category: bq.legalArea || 'Derecho Civil',
        options: options,
        correctAnswer: bq.correctAnswer,
        explanation: bq.explanation || '',
        legalArea: bq.legalArea || 'Derecho Civil',
        difficulty: bq.difficulty || 1,
        userAnswer: undefined
      };
    });
  }

  // GENERAR OPCIONES PARA PREGUNTAS
  generateOptionsForQuestion(question: any): { id: string; text: string; }[] {
    if (question.options && question.options.length > 0) {
      if (typeof question.options[0] === 'object' && question.options[0].id) {
        return question.options;
      }
      
      return question.options.map((opt: string, index: number) => ({
        id: String.fromCharCode(65 + index),
        text: opt
      }));
    }

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
    if (!this.canSelectOption()) {
      return;
    }
    
    this.selectedAnswer = optionId;
    if (this.questions[this.currentQuestionIndex]) {
      this.questions[this.currentQuestionIndex].userAnswer = optionId;
    }
    
    console.log('Respuesta seleccionada:', optionId);
  }

  // Verificar si hay respuesta seleccionada
  hasSelectedAnswer(): boolean {
    return this.selectedAnswer !== '';
  }

  // SIGUIENTE PREGUNTA
  async nextQuestion() {
    if (!this.hasSelectedAnswer()) {
      return;
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    try {
      const answerData = {
        questionId: currentQuestion.id,
        userAnswer: this.selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        questionType: currentQuestion.type,
        timeSpentSeconds: 30,
        generateFollowUp: false,
        originalQuestionText: currentQuestion.questionText,
        legalArea: currentQuestion.legalArea,
        difficulty: currentQuestion.difficulty
      };

      const response = await this.apiService.answerQuestion(answerData).toPromise();
      console.log('Respuesta enviada al backend:', response);

    } catch (error) {
      console.error('Error enviando respuesta:', error);
    }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestionNumber++;
      this.selectedAnswer = this.questions[this.currentQuestionIndex].userAnswer || '';
      
      this.apiService.updateCurrentQuestionIndex(this.currentQuestionIndex);
    } else {
      this.finishTest();
    }
  }

  // FINALIZAR TEST CON POPUP DE RESULTADOS
  async finishTest() {
    this.isTestCompleted = true;
    if (this.timer) {
      clearInterval(this.timer);
    }

    const correctAnswers = this.questions.filter(q => q.userAnswer === q.correctAnswer).length;
    const incorrectAnswers = this.questions.length - correctAnswers;
    const percentage = Math.round((correctAnswers / this.questions.length) * 100);
    const timeUsed = this.testConfig.timeLimit * 60 - this.timeRemaining;

    const suggestedLevel = this.calculateSuggestedLevel(percentage);

    await this.showResultsPopup({
      correctAnswers,
      incorrectAnswers,
      totalQuestions: this.questions.length,
      percentage,
      timeUsed,
      suggestedLevel
    });
  }

  // CALCULAR NIVEL SUGERIDO BASADO EN RESULTADOS
  calculateSuggestedLevel(percentage: number): string {
    if (percentage >= 90) {
      return 'Experto';
    } else if (percentage >= 75) {
      return 'Avanzado';
    } else if (percentage >= 60) {
      return 'Intermedio';
    } else if (percentage >= 40) {
      return 'Básico';
    } else {
      return 'Principiante';
    }
  }

  // GUARDAR RESULTADOS EN STORAGE LOCAL
  saveTestResults(results: any) {
    const resultsToSave = {
      correctAnswers: results.correctAnswers,
      incorrectAnswers: results.incorrectAnswers,
      percentage: results.percentage,
      suggestedLevel: results.suggestedLevel,
      timestamp: new Date().toISOString(),
      hasResults: true
    };
    
    localStorage.setItem('lastTestResults', JSON.stringify(resultsToSave));
    console.log('Resultados guardados:', resultsToSave);
  }

  // MOSTRAR POPUP DE RESULTADOS CON GUARDADO
  async showResultsPopup(results: any) {
    // Guardar resultados antes de mostrar el popup
    this.saveTestResults(results);
    
    const alert = await this.alertController.create({
      header: 'Resultados del Test',
      message: `
        Correctas: ${results.correctAnswers}
        Incorrectas: ${results.incorrectAnswers}
        Porcentaje: ${results.percentage}%
        Nivel: ${results.suggestedLevel}
        Tiempo: ${this.formatTimeUsed(results.timeUsed)}
      `,
      buttons: [
        {
          text: 'Ver Detalles',
          handler: () => {
            this.goToDetailedResults(results);
          }
        },
        {
          text: 'Continuar',
          handler: () => {
            this.goBackToMenu();
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  // FORMATEAR TIEMPO USADO
  formatTimeUsed(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // IR A RESULTADOS DETALLADOS
  goToDetailedResults(results: any) {
    this.apiService.clearCurrentSession();

    this.router.navigate(['/civil/civil-escrito/resultados'], {
      queryParams: {
        correctAnswers: results.correctAnswers,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        timeUsed: results.timeUsed,
        sessionId: this.sessionId,
        suggestedLevel: results.suggestedLevel
      }
    });
  }

  // VOLVER AL MENÚ PRINCIPAL
  goBackToMenu() {
    this.apiService.clearCurrentSession();
    this.router.navigate(['/civil/civil-escrito']);
  }

  // Obtener progreso
  getProgress(): number {
    return (this.currentQuestionNumber / this.totalQuestions) * 100;
  }

  // Obtener color de la categoría
  getCategoryColor(): string {
    const question = this.getCurrentQuestion();
    if (!question) return '#9C27B0';
    
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

  // MÉTODOS PARA FEEDBACK VISUAL

  hasAnsweredCurrentQuestion(): boolean {
    return this.selectedAnswer !== '';
  }

  isCorrectAnswer(optionId: string): boolean {
    const currentQuestion = this.getCurrentQuestion();
    return currentQuestion ? currentQuestion.correctAnswer === optionId : false;
  }

  isIncorrectAnswer(optionId: string): boolean {
    return this.hasAnsweredCurrentQuestion() && 
           this.isOptionSelected(optionId) && 
           !this.isCorrectAnswer(optionId);
  }

  getOptionState(optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' {
    if (!this.hasAnsweredCurrentQuestion()) {
      return this.isOptionSelected(optionId) ? 'selected' : 'default';
    }
    
    if (this.isCorrectAnswer(optionId)) {
      return 'correct';
    }
    
    if (this.isIncorrectAnswer(optionId)) {
      return 'incorrect';
    }
    
    return 'default';
  }

  shouldShowOptionIcon(optionId: string): boolean {
    return this.hasAnsweredCurrentQuestion();
  }

  getOptionIcon(optionId: string): string {
    if (!this.hasAnsweredCurrentQuestion()) {
      return '';
    }
    
    if (this.isCorrectAnswer(optionId)) {
      return 'checkmark-circle';
    }
    
    if (this.isIncorrectAnswer(optionId)) {
      return 'close-circle';
    }
    
    return '';
  }

  getOptionIconColor(optionId: string): string {
    if (this.isCorrectAnswer(optionId)) {
      return '#4CAF50';
    }
    
    if (this.isIncorrectAnswer(optionId)) {
      return '#F44336';
    }
    
    return '';
  }

  canSelectOption(): boolean {
    return !this.hasAnsweredCurrentQuestion();
  }

  // SALIR DEL TEST
  exitTest() {
    if (confirm('¿Estás seguro de que quieres salir del test? Se perderá tu progreso.')) {
      if (this.timer) {
        clearInterval(this.timer);
      }
      
      this.apiService.clearCurrentSession();
      this.router.navigate(['/civil/civil-escrito']);
    }
  }

  // MÉTODOS AUXILIARES PARA LA VISTA

  isQuestionsLoading(): boolean {
    return this.isLoading;
  }

  hasLoadingError(): boolean {
    return this.loadingError;
  }

  retryLoading() {
    this.loadingError = false;
    this.loadSessionFromBackend();
  }

  getCurrentQuestionCategory(): string {
    const question = this.getCurrentQuestion();
    return question?.category || question?.legalArea || 'Sin categoría';
  }

  getCurrentQuestionText(): string {
    const question = this.getCurrentQuestion();
    return question?.text || question?.questionText || '';
  }

  getCurrentQuestionOptions(): { id: string; text: string; }[] {
    const question = this.getCurrentQuestion();
    return question?.options || [];
  }
}