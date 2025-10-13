// INICIO DEL ARCHIVO - Copiar desde aquí
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';

interface Question {
  id: string;
  text: string;
  questionText: string;
  type: string | number;
  category: string;
  tema: string;
  legalArea: string;
  difficulty: number;
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
  options?: any[];
  [key: string]: any;
}

interface BackendSession {
  testId?: number;
  session: any;
  questions: any[];
  currentQuestionIndex: number;
  totalQuestions: number;
}

interface TestResults {
  correctAnswers: number;
  incorrectAnswers: number;
  totalAnswered: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  level: string;
  incorrectQuestions: any[];
  timeUsed?: number;
  timeUsedFormatted?: string;
  sessionId?: string;
}

@Component({
  selector: 'app-test-escrito-civil',
  templateUrl: './test-escrito-civil.page.html',
  styleUrls: ['./test-escrito-civil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TestEscritoCivilPage implements OnInit, OnDestroy {

  currentQuestionIndex = 0;
  questions: Question[] = [];
  selectedAnswer: string = '';
  timeRemaining = 0;
  timer: any;
  isTestCompleted = false;
  isLoading = true;
  loadingError = false;

  totalQuestions = 10;
  currentQuestionNumber = 1;

  currentSession: BackendSession | null = null;
  sessionId: string = '';
  testId: number = 0;

  questionStartTime: Date = new Date();

  constructor(
    private router: Router,
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef
  ) { 
    console.log('TestEscritoCivilPage constructor inicializado');
  }

  ngOnInit() {
    console.log('TestEscritoCivilPage ngOnInit iniciado');
    this.loadSessionFromBackend();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async loadSessionFromBackend() {
    try {
      console.log('Iniciando carga de sesión...');
      
      const session = this.apiService.getCurrentSession();
      
      if (!session || !session.questions || session.questions.length === 0) {
        console.error('❌ No hay sesión activa o no tiene preguntas');
        this.loadingError = true;
        this.isLoading = false;
        return;
      }

      console.log('✅ Sesión encontrada:', session);
      
      this.currentSession = session as BackendSession;
      this.testId = session.testId || session.session?.id || 0;
      this.sessionId = session.session?.id?.toString() || '';
      
      console.log('🆔 Test ID:', this.testId);
      console.log('🆔 Session ID:', this.sessionId);
      
      setTimeout(() => {
        try {
          this.questions = this.convertBackendQuestions(session.questions);
          
          if (this.questions.length === 0) {
            console.error('❌ No se pudieron convertir las preguntas');
            this.loadingError = true;
            this.isLoading = false;
            return;
          }

          this.totalQuestions = this.questions.length;
          this.currentQuestionNumber = 1;
          this.currentQuestionIndex = 0;
          
          console.log(`✅ ${this.totalQuestions} preguntas cargadas correctamente`);
          console.log('📋 Primera pregunta:', this.questions[0]);
          
          this.isLoading = false;
          this.cdr.detectChanges();
          
          this.questionStartTime = new Date();
          
        } catch (conversionError) {
          console.error('Error en conversión de preguntas:', conversionError);
          this.loadingError = true;
          this.isLoading = false;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error en loadSessionFromBackend:', error);
      this.loadingError = true;
      this.isLoading = false;
    }
  }

  convertBackendQuestions(backendQuestions: any[]): Question[] {
    if (!Array.isArray(backendQuestions)) {
      console.error('backendQuestions no es un array:', backendQuestions);
      return [];
    }
    
    return backendQuestions.map((q: any, index: number) => {
      const convertedQuestion: Question = {
        id: q.id?.toString() || `temp-${index}`,
        text: q.questionText || q.text || 'Texto no disponible',
        questionText: q.questionText || q.text || 'Texto no disponible',
        type: q.type || 'seleccion_multiple',
        category: q.tema || q.category || q.legalArea || 'Sin categoría',
        tema: q.tema || q.category || q.legalArea || 'Sin categoría',
        legalArea: q.legalArea || q.tema || q.category || 'General',
        difficulty: q.difficulty || q.level || 2,
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || 'Explicación no disponible',
        options: q.options || []
      };

      return convertedQuestion;
    });
  }

  getCurrentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  getCurrentQuestionText(): string {
    const question = this.getCurrentQuestion();
    return question?.questionText || question?.text || 'Pregunta no disponible';
  }

  // ✅ CATEGORÍA REAL DE LA BD
  getCurrentQuestionCategory(): string {
    const question = this.getCurrentQuestion();
    return question?.tema || question?.category || question?.legalArea || 'Sin categoría';
  }

  getCurrentQuestionOptions(): string[] {
    const question = this.getCurrentQuestion();
    
    if (!question) {
      console.warn('⚠️ No hay pregunta actual');
      return [];
    }

    // ✅ Verdadero/Falso
    if (this.isTrueFalseQuestion()) {
      return ['Verdadero', 'Falso'];
    }

    // ✅ Selección múltiple
    if (Array.isArray(question.options) && question.options.length > 0) {
      const firstOption = question.options[0];
      
      if (typeof firstOption === 'object') {
        // Probar con minúscula primero (formato del backend)
        if ('text' in firstOption && firstOption.text) {
          const optionsArray = question.options.map((opt: any) => opt.text);
          return optionsArray;
        }
        // Probar con mayúscula
        if ('Text' in firstOption && firstOption.Text) {
          const optionsArray = question.options.map((opt: any) => opt.Text);
          return optionsArray;
        }
      }
      
      // Si ya son strings directamente
      if (typeof firstOption === 'string') {
        return question.options;
      }
    }

    console.error('❌ No se encontraron opciones válidas');
    return [];
  }

  isTrueFalseQuestion(): boolean {
    const question = this.getCurrentQuestion();
    return question?.type === 'verdadero_falso' || question?.type === 2 || question?.type === '2';
  }

  async selectAnswer(optionText: string) {
    if (this.hasAnsweredCurrentQuestion()) {
      console.log('Ya respondiste esta pregunta');
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    let normalizedAnswer: string;
    
    // ✅ Verdadero/Falso
    if (this.isTrueFalseQuestion()) {
      normalizedAnswer = optionText === 'Verdadero' ? 'V' : 'F';
    } 
    // ✅ Selección múltiple
    else {
      const options = this.getCurrentQuestionOptions();
      const optionIndex = options.indexOf(optionText);
      
      if (optionIndex !== -1) {
        normalizedAnswer = String.fromCharCode(65 + optionIndex);
        console.log(`✅ Opción seleccionada: Letra ${normalizedAnswer} = "${optionText}"`);
      } else {
        console.error('❌ No se encontró la opción en el array');
        return;
      }
    }
    
    question.userAnswer = normalizedAnswer;
    
    const isCorrect = this.compareAnswers(normalizedAnswer, question.correctAnswer);
    
    // ✅ MOSTRAR POP-UP SI SE EQUIVOCÓ
    if (!isCorrect) {
      await this.showExplanationAlert(question.explanation);
    }
    
    await this.sendAnswerToBackend(question, normalizedAnswer);
    this.cdr.detectChanges();
  }

  // ✅ NUEVO: POP-UP DE EXPLICACIÓN
  async showExplanationAlert(explanation: string) {
    const alert = await this.alertController.create({
      header: '💡 Explicación',
      message: explanation,
      cssClass: 'explanation-alert',
      buttons: [
        {
          text: 'Entendido',
          role: 'confirm',
          cssClass: 'alert-button-confirm'
        }
      ]
    });

    await alert.present();
  }

  async sendAnswerToBackend(question: Question, answer: string) {
    try {
      const questionEndTime = new Date();
      const responseTime = Math.floor((questionEndTime.getTime() - this.questionStartTime.getTime()) / 1000);
      
      const hours = Math.floor(responseTime / 3600);
      const minutes = Math.floor((responseTime % 3600) / 60);
      const seconds = responseTime % 60;
      const timeSpanString = `PT${hours}H${minutes}M${seconds}S`;
      
      const answerData = {
        testId: this.testId,
        preguntaId: parseInt(question.id),
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        timeSpent: timeSpanString,
        numeroOrden: this.currentQuestionIndex + 1,
        isCorrect: this.compareAnswers(answer, question.correctAnswer)
      };
      
      console.log('📤 Enviando respuesta al backend:', answerData);
      
      await this.apiService.submitAnswer(answerData).toPromise();
      console.log('✅ Respuesta enviada correctamente');
      
    } catch (error) {
      console.error('❌ Error enviando respuesta:', error);
    }
  }

  compareAnswers(userAnswer: string, correctAnswer: string): boolean {
    const normalizedUser = userAnswer.trim().toUpperCase();
    const normalizedCorrect = correctAnswer.trim().toUpperCase();
    
    if (normalizedUser === normalizedCorrect) return true;
    
    // V/F comparisons
    if ((normalizedUser === 'V' || normalizedUser === 'VERDADERO' || normalizedUser === 'TRUE') &&
        (normalizedCorrect === 'V' || normalizedCorrect === 'VERDADERO' || normalizedCorrect === 'TRUE')) {
      return true;
    }
    
    if ((normalizedUser === 'F' || normalizedUser === 'FALSO' || normalizedUser === 'FALSE') &&
        (normalizedCorrect === 'F' || normalizedCorrect === 'FALSO' || normalizedCorrect === 'FALSE')) {
      return true;
    }
    
    return false;
  }

  async nextQuestion() {
    if (!this.hasAnsweredCurrentQuestion()) {
      await this.showAnswerRequiredAlert();
      return;
    }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestionNumber++;
      this.selectedAnswer = '';
      this.questionStartTime = new Date();
      
      console.log(`➡️ Avanzando a pregunta ${this.currentQuestionNumber} de ${this.totalQuestions}`);
    } else {
      this.finishTest();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.currentQuestionNumber--;
      this.selectedAnswer = '';
      
      console.log(`⬅️ Retrocediendo a pregunta ${this.currentQuestionNumber} de ${this.totalQuestions}`);
    }
  }

  hasAnsweredCurrentQuestion(): boolean {
    const question = this.getCurrentQuestion();
    return !!question?.userAnswer;
  }

  async showAnswerRequiredAlert() {
    const alert = await this.alertController.create({
      header: 'Respuesta requerida',
      message: 'Debes seleccionar una respuesta antes de continuar.',
      buttons: ['OK']
    });
    await alert.present();
  }

  isOptionSelected(optionText: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !question.userAnswer) return false;
    
    // Para V/F
    if (this.isTrueFalseQuestion()) {
      if (question.userAnswer === 'V' && optionText === 'Verdadero') return true;
      if (question.userAnswer === 'F' && optionText === 'Falso') return true;
      return false;
    }
    
    // Para selección múltiple
    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(optionText);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.userAnswer === letter;
    }
    
    return false;
  }

  getOptionState(optionText: string): 'correct' | 'incorrect' | 'default' {
    if (!this.hasAnsweredCurrentQuestion()) return 'default';
    
    const question = this.getCurrentQuestion();
    if (!question) return 'default';
    
    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(optionText);
    
    if (optionIndex === -1) return 'default';
    
    const optionLetter = String.fromCharCode(65 + optionIndex);
    
    const isCorrect = this.compareAnswers(optionLetter, question.correctAnswer);
    const isSelected = question.userAnswer === optionLetter;
    
    if (isCorrect) return 'correct';
    if (isSelected && !isCorrect) return 'incorrect';
    
    return 'default';
  }

  canSelectOption(): boolean {
    return !this.hasAnsweredCurrentQuestion();
  }

  getOptionLetter(index: number): string {
    if (this.isTrueFalseQuestion()) {
      return index === 0 ? 'V' : 'F';
    }
    return String.fromCharCode(65 + index);
  }

  shouldShowOptionIcon(option: string): boolean {
    return this.hasAnsweredCurrentQuestion();
  }

  getOptionIcon(option: string): string {
    const state = this.getOptionState(option);
    if (state === 'correct') return 'checkmark-circle';
    if (state === 'incorrect') return 'close-circle';
    return '';
  }

  getOptionIconColor(option: string): string {
    const state = this.getOptionState(option);
    if (state === 'correct') return '#4CAF50';
    if (state === 'incorrect') return '#F44336';
    return '';
  }

  async finishTest() {
    if (!this.hasAnsweredCurrentQuestion()) {
      await this.showAnswerRequiredAlert();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando resultados...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const results = this.calculateResults();
      localStorage.setItem('current_test_results', JSON.stringify(results));
      
      await loading.dismiss();
      
      this.apiService.clearCurrentSession();
      await this.router.navigate(['/civil/civil-escrito/resumen-test-civil']);
      
    } catch (error) {
      console.error('Error finalizando test:', error);
      await loading.dismiss();
    }
  }

  calculateResults(): TestResults {
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const incorrectQuestions: any[] = [];

    this.questions.forEach((question, index) => {
      const isCorrect = this.compareAnswers(
        question.userAnswer || '',
        question.correctAnswer
      );

      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
        incorrectQuestions.push({
          questionNumber: index + 1,
          questionText: question.questionText,
          userAnswer: question.userAnswer,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        });
      }
    });

    const totalAnswered = correctAnswers + incorrectAnswers;
    const percentage = totalAnswered > 0 
      ? Math.round((correctAnswers / totalAnswered) * 100) 
      : 0;

    return {
      correctAnswers,
      incorrectAnswers,
      totalAnswered,
      totalQuestions: this.totalQuestions,
      percentage,
      grade: this.getGradeFromPercentage(percentage),
      level: this.getLevelFromPercentage(percentage),
      incorrectQuestions,
      sessionId: this.sessionId
    };
  }

  getGradeFromPercentage(percentage: number): string {
    if (percentage >= 90) return 'Excelente';
    if (percentage >= 80) return 'Muy Bien';
    if (percentage >= 70) return 'Bien';
    if (percentage >= 60) return 'Suficiente';
    return 'Insuficiente';
  }

  getLevelFromPercentage(percentage: number): string {
    if (percentage >= 80) return 'Avanzado';
    if (percentage >= 60) return 'Intermedio';
    return 'Básico';
  }

  exitTest() {
    console.log('Saliendo del test...');
    this.apiService.clearCurrentSession();
    this.router.navigate(['/civil/civil-escrito']);
  }

  retryLoading() {
    this.loadingError = false;
    this.isLoading = true;
    this.loadSessionFromBackend();
  }
}