// INICIO DEL ARCHIVO - Copiar desde aquí
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { SoundService } from '../../../../services/sound.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Question {
  id: string;
  text: string;
  questionText: string;
  type: string | number;
  category: string;
  tema: string;
  legalArea: string;
  difficulty: number | string;
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
  wasAnswered?: boolean;
  wasCorrect?: boolean;
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
  allQuestions?: any[];
  timeUsed?: number;
  timeUsedFormatted?: string;
  sessionId?: string;
}

@Component({
  selector: 'app-test-escrito-civil',
  templateUrl: './test-escrito-civil.page.html',
  styleUrls: ['./test-escrito-civil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ],
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

  showEvaluation: boolean = false;
  evaluationResult: any = null;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef,
    private soundService: SoundService
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

      this.currentSession = session;
      this.testId = session.testId || 0;
      this.sessionId = session.session?.sessionId || '';
      
      console.log('✅ Sesión cargada:', {
        testId: this.testId,
        sessionId: this.sessionId,
        totalQuestions: session.questions.length
      });

      this.questions = this.convertBackendQuestions(session.questions);
      this.totalQuestions = this.questions.length;
      this.currentQuestionIndex = session.currentQuestionIndex || 0;
      this.currentQuestionNumber = this.currentQuestionIndex + 1;

      await this.skipInvalidQuestions();

      this.isLoading = false;
      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Error cargando sesión:', error);
      this.loadingError = true;
      this.isLoading = false;
    }
  }

  convertBackendQuestions(backendQuestions: any[]): Question[] {
    return backendQuestions.map((q: any, index: number) => 
      this.convertSingleQuestion(q, index)
    );
  }

  convertSingleQuestion(q: any, index: number): Question {
    return {
      id: q.id?.toString() || `q_${index}`,
      text: q.texto_pregunta || q.questionText || q.text || '',
      questionText: q.texto_pregunta || q.questionText || q.text || '',
      type: q.tipo || q.type || 1,
      category: q.tema || q.category || 'Derecho Civil',
      tema: q.tema || q.category || 'Derecho Civil',
      legalArea: q.legalArea || 'Derecho Civil',
      difficulty: q.nivel || q.level || q.difficulty || 2,
      correctAnswer: q.respuesta_correcta || q.correctAnswer || '',
      explanation: q.explicacion || q.explanation || 'Sin explicación disponible',
      options: q.opciones || q.options || [],
      userAnswer: q.userAnswer || undefined,
      wasAnswered: false,
      wasCorrect: undefined
    };
  }
  getCurrentQuestion(): Question | null {
    if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  getCurrentQuestionOptions(): string[] {
    const question = this.getCurrentQuestion();
    
    if (!question) {
      console.warn('⚠️ No hay pregunta actual');
      return [];
    }

    if (this.isTrueFalseQuestion()) {
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

    console.error('❌ Pregunta sin opciones válidas:', question);
    
    if (!question.userAnswer) {
      question.userAnswer = 'SKIP';
    }
    
    return [];
  }

  getOptionLetterByText(optionText: string): string | null {
    const question = this.getCurrentQuestion();
    if (!question || !Array.isArray(question.options)) return null;

    const option = question.options.find((opt: any) => {
      if (typeof opt === 'object') {
        return (opt.text === optionText || opt.Text === optionText);
      }
      return opt === optionText;
    });

    if (option && typeof option === 'object' && ('Id' in option || 'id' in option)) {
      return (option.Id || option.id || '').toString().toUpperCase();
    }

    return null;
  }

  isTrueFalseQuestion(): boolean {
    const question = this.getCurrentQuestion();
    return question?.type === 'verdadero_falso' || question?.type === 2 || question?.type === '2';
  }

  async selectAnswer(optionText: string) {
    if (this.hasAnsweredCurrentQuestion()) {
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    let normalizedAnswer: string;
    
    const correctionConfig = localStorage.getItem('correctionConfig');
    const showImmediateCorrection = correctionConfig 
      ? JSON.parse(correctionConfig).immediate 
      : true;

    if (!showImmediateCorrection) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics no disponible:', error);
      }
    }
    
    if (this.isTrueFalseQuestion()) {
      const letterFromBackend = this.getOptionLetterByText(optionText);
      
      if (letterFromBackend) {
        normalizedAnswer = letterFromBackend;
      } else {
        normalizedAnswer = optionText === 'Verdadero' ? 'A' : 'B';
      }
      
      const answerForBackend = optionText === 'Verdadero' ? 'true' : 'false';
      question.userAnswer = normalizedAnswer;
      
      const isCorrect = this.compareAnswers(answerForBackend, question.correctAnswer);
      
      if (showImmediateCorrection) {
        question.wasAnswered = true;
        question.wasCorrect = isCorrect;
        
        console.log(`${isCorrect ? '✓' : '✗'} V/F: "${optionText}" → ${answerForBackend} (correcta: ${question.correctAnswer})`);
        
        this.showEvaluationPanel(question, optionText, isCorrect);
      } else {
        question.wasAnswered = true;
        question.wasCorrect = undefined;
      }
      
      await this.sendAnswerToBackend(question, answerForBackend);
      this.cdr.detectChanges();
      return;
    }
    
    const letterFromBackend = this.getOptionLetterByText(optionText);
    
    if (letterFromBackend) {
      normalizedAnswer = letterFromBackend;
    } else {
      const options = this.getCurrentQuestionOptions();
      const optionIndex = options.indexOf(optionText);
      
      if (optionIndex !== -1) {
        normalizedAnswer = String.fromCharCode(65 + optionIndex);
      } else {
        console.error('❌ No se encontró la opción en el array');
        return;
      }
    }
    
    question.userAnswer = normalizedAnswer;
    
    const isCorrect = this.compareAnswers(normalizedAnswer, question.correctAnswer);
    
    if (showImmediateCorrection) {
      question.wasAnswered = true;
      question.wasCorrect = isCorrect;
      
      console.log(`${isCorrect ? '✓' : '✗'} "${optionText}" = ${normalizedAnswer} (correcta: ${question.correctAnswer})`);
      
      this.showEvaluationPanel(question, optionText, isCorrect);
    } else {
      question.wasAnswered = true;
      question.wasCorrect = undefined;
    }
    
    await this.sendAnswerToBackend(question, normalizedAnswer);
    this.cdr.detectChanges();
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
    const normalize = (str: string) => {
      if (!str) return '';
      return str.toString().toLowerCase().trim();
    };

    const user = normalize(userAnswer);
    const correct = normalize(correctAnswer);

    if (user === correct) return true;

    if ((user === 'v' || user === 'true' || user === 'verdadero' || user === 'a') &&
        (correct === 'v' || correct === 'true' || correct === 'verdadero' || correct === 'a')) {
      return true;
    }

    if ((user === 'f' || user === 'false' || user === 'falso' || user === 'b') &&
        (correct === 'f' || correct === 'false' || correct === 'falso' || correct === 'b')) {
      return true;
    }

    return false;
  }

  hasAnsweredCurrentQuestion(): boolean {
    const question = this.getCurrentQuestion();
    if (!question) return false;
    return question.wasAnswered === true;
  }

  isOptionSelected(optionText: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !question.userAnswer) return false;

    if (this.isTrueFalseQuestion()) {
      const userAnswerNormalized = question.userAnswer.toUpperCase();
      if (optionText === 'Verdadero') {
        return userAnswerNormalized === 'V' || userAnswerNormalized === 'A' || userAnswerNormalized === 'TRUE';
      }
      if (optionText === 'Falso') {
        return userAnswerNormalized === 'F' || userAnswerNormalized === 'B' || userAnswerNormalized === 'FALSE';
      }
    }

    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(optionText);
    
    if (optionIndex === -1) return false;
    
    const optionLetter = String.fromCharCode(65 + optionIndex);
    
    return question.userAnswer === optionLetter;
  }

  getOptionLetter(index: number): string {
    if (this.isTrueFalseQuestion()) {
      const options = this.getCurrentQuestionOptions();
      return options[index] === 'Verdadero' ? 'V' : 'F';
    }
    return String.fromCharCode(65 + index);
  }

  shouldShowOptionIcon(option: string): boolean {
    return this.hasAnsweredCurrentQuestion();
  }

  getOptionState(optionText: string): 'correct' | 'incorrect' | 'selected' | 'default' {
    if (!this.hasAnsweredCurrentQuestion()) return 'default';
    
    const correctionConfig = localStorage.getItem('correctionConfig');
    const showImmediateCorrection = correctionConfig 
      ? JSON.parse(correctionConfig).immediate 
      : true;
    
    const question = this.getCurrentQuestion();
    if (!question) return 'default';

    if (!showImmediateCorrection) {
      return this.isOptionSelected(optionText) ? 'selected' : 'default';
    }

 if (this.isTrueFalseQuestion()) {
      const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
      const isVerdaderoCorrect = correctAnswerNorm === 'true' || 
                                 correctAnswerNorm === 'v' || 
                                 correctAnswerNorm === 'verdadero';
      
      const optionIsVerdadero = optionText === 'Verdadero';
      const optionIsFalso = optionText === 'Falso';
      
      // Mostrar la correcta en verde
      if ((optionIsVerdadero && isVerdaderoCorrect) || (optionIsFalso && !isVerdaderoCorrect)) {
        return 'correct';
      }
      
      // Mostrar la incorrecta en rojo (soportando múltiples formatos)
      const userAnswer = question.userAnswer?.toUpperCase();
      if ((userAnswer === 'V' || userAnswer === 'A') && optionIsVerdadero && !isVerdaderoCorrect) {
        return 'incorrect';
      }
      if ((userAnswer === 'F' || userAnswer === 'B') && optionIsFalso && isVerdaderoCorrect) {
        return 'incorrect';
      }
      
      return 'default';
    }

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
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    
    await loading.present();

    try {
      const results = this.calculateResults();
      
      console.log('📊 Resultados calculados:', results);
      
      const currentSession = this.apiService.getCurrentSession();
      if (currentSession && currentSession.testId) {
        try {
          const response = await this.apiService.finishTest(currentSession.testId).toPromise();
          console.log('✅ Test guardado en BD:', response);
        } catch (error) {
          console.error('❌ Error guardando test en BD:', error);
        }
      }
      
      localStorage.setItem('current_test_results', JSON.stringify(results));
      
      await loading.dismiss();
      
      this.apiService.clearCurrentSession();
      
      console.log('🎯 Navegando a resumen...');
      await this.router.navigate(['/civil/civil-escrito/resumen-test-civil']);
      
    } catch (error) {
      console.error('❌ Error finalizando test:', error);
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Hubo un problema al guardar los resultados. ¿Deseas intentar de nuevo?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Reintentar',
            handler: () => {
              this.finishTest();
            }
          }
        ]
      });
      
      await alert.present();
    }
  }

  calculateResults(): TestResults {
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const incorrectQuestions: any[] = [];
    const allQuestions: any[] = [];

    this.questions.forEach((question, index) => {
      if (question.userAnswer === 'SKIP') {
        console.log(`⤼ Pregunta ${index + 1} saltada (sin opciones), no se incluye en resultados`);
        return;
      }

      const isCorrect = this.compareAnswers(
        question.userAnswer || '',
        question.correctAnswer
      );

      const questionData = {
        questionNumber: index + 1,
        questionText: question.questionText || question.text,
        userAnswer: question.userAnswer || '',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        isCorrect: isCorrect,
        options: question.options || [],
        type: question.type
      };

      allQuestions.push(questionData);

      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
        incorrectQuestions.push(questionData);
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
      totalQuestions: allQuestions.length,
      percentage,
      grade: this.getGradeFromPercentage(percentage),
      level: this.getLevelFromPercentage(percentage),
      incorrectQuestions,
      allQuestions,
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

  async showAnswerRequiredAlert() {
    const alert = await this.alertController.create({
      header: 'Respuesta requerida',
      message: 'Debes responder la pregunta actual antes de continuar',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  nextQuestion() {
    if (!this.hasAnsweredCurrentQuestion()) {
      this.showAnswerRequiredAlert();
      return;
    }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentQuestionNumber++;
      this.questionStartTime = new Date();
      this.closeEvaluation();
      this.skipInvalidQuestions();
    } else {
      this.finishTest();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.currentQuestionNumber--;
      this.questionStartTime = new Date();
      this.closeEvaluation();
    }
  }

  async confirmExit() {
    const alert = await this.alertController.create({
      header: 'Abandonar test',
      message: 'Si abandonas ahora, no se guardarán tus respuestas. Se perderá tu progreso.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Abandonar',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/civil/civil-escrito']);
          }
        }
      ]
    });

    await alert.present();
  }

  retry() {
    this.loadingError = false;
    this.isLoading = true;
    this.loadSessionFromBackend();
  }

  async skipInvalidQuestions() {
    const options = this.getCurrentQuestionOptions();
    
    if (options.length === 0) {
      console.log('⤼ Pregunta sin opciones detectada, solicitando reemplazo...');
      
      const question = this.getCurrentQuestion();
      if (!question) return;
      
      question.userAnswer = 'SKIP';
      
      try {
        const newQuestion = await this.requestReplacementQuestion();
        
        if (newQuestion) {
          console.log('✓ Pregunta de reemplazo recibida:', newQuestion);
          
          this.questions[this.currentQuestionIndex] = this.convertSingleQuestion(newQuestion, this.currentQuestionIndex);
          
          this.questions[this.currentQuestionIndex].userAnswer = undefined;
          
          this.cdr.detectChanges();
          
          console.log('✓ Pregunta reemplazada exitosamente');
        } else {
          console.warn('⚠️ No se pudo obtener pregunta de reemplazo, saltando...');
          this.autoSkipQuestion();
        }
      } catch (error) {
        console.error('❌ Error obteniendo pregunta de reemplazo:', error);
        this.autoSkipQuestion();
      }
    }
  }

  async requestReplacementQuestion(): Promise<any> {
    try {
      const response = await this.apiService.getReplacementQuestion(this.testId).toPromise();
      
      if (response && response.success && response.question) {
        return response.question;
      }
      
      return null;
    } catch (error) {
      console.error('Error solicitando pregunta de reemplazo:', error);
      return null;
    }
  }

  autoSkipQuestion() {
    setTimeout(() => {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
        this.currentQuestionNumber++;
        this.skipInvalidQuestions();
      } else {
        this.finishTest();
      }
    }, 100);
  }

  showEvaluationPanel(question: Question, userAnswerText: string, isCorrect: boolean) {
    this.soundService.play(isCorrect ? 'correct' : 'incorrect');
    this.evaluationResult = {
      isCorrect: isCorrect,
      userAnswer: userAnswerText,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || 'Explicación no disponible'
    };
    
    this.showEvaluation = true;
    console.log('📊 Mostrando panel de evaluación:', this.evaluationResult);
  }

  closeEvaluation() {
    this.showEvaluation = false;
    this.evaluationResult = null;
  }

  exitTest() {
    this.router.navigate(['/civil/civil-escrito']);
  }

  getCurrentQuestionCategory(): string {
    const question = this.getCurrentQuestion();
    return question?.tema || question?.category || 'Derecho Civil';
  }

  shouldShowDifficultyLevel(): boolean {
    return true;
  }

  getCurrentQuestionDifficulty(): string {
    const question = this.getCurrentQuestion();
    const difficulty = question?.difficulty || question?.['level'];
    
    if (!difficulty) return 'Intermedio';
    
    const diffStr = difficulty.toString().toLowerCase();
    
    if (diffStr === '1' || diffStr === 'basico' || diffStr === 'básico') return 'Básico';
    if (diffStr === '3' || diffStr === 'avanzado') return 'Avanzado';
    return 'Intermedio';
  }

  getCurrentQuestionText(): string {
    const question = this.getCurrentQuestion();
    return question?.questionText || question?.text || '';
  }

  canSelectOption(): boolean {
    return !this.hasAnsweredCurrentQuestion();
  }

  retryLoading() {
    this.retry();
  }
}
