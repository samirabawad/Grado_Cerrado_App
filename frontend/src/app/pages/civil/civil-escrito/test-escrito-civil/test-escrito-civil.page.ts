// INICIO DEL ARCHIVO - Copiar desde aquí
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { trigger, transition, style, animate } from '@angular/animations';

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

  // Propiedades para panel de evaluación (como test-oral)
  showEvaluation: boolean = false;
  evaluationResult: any = null;

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
        console.error('✗ No hay sesión activa o no tiene preguntas');
        this.loadingError = true;
        this.isLoading = false;
        return;
      }

      console.log('✓ Sesión encontrada:', session);
      
      this.currentSession = session as BackendSession;
      this.testId = session.testId || session.session?.id || 0;
      this.sessionId = session.session?.id?.toString() || '';
      
      console.log('Test ID:', this.testId);
      console.log('Session ID:', this.sessionId);
      
      setTimeout(() => {
        try {
          this.questions = this.convertBackendQuestions(session.questions);
          
          if (this.questions.length === 0) {
            console.error('✗ No se pudieron convertir las preguntas');
            this.loadingError = true;
            this.isLoading = false;
            return;
          }

          this.totalQuestions = this.questions.length;
          this.currentQuestionNumber = 1;
          this.currentQuestionIndex = 0;
          
          console.log(`✓ ${this.totalQuestions} preguntas cargadas correctamente`);
          console.log('Primera pregunta:', this.questions[0]);
          
          this.isLoading = false;
          this.cdr.detectChanges();

          this.questionStartTime = new Date();

          this.skipInvalidQuestions();

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
      return this.convertSingleQuestion(q, index);
    });
  }

  // ✅ NUEVO: Convertir una sola pregunta
  convertSingleQuestion(q: any, index: number): Question {
    return {
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
  }

  getCurrentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  getCurrentQuestionText(): string {
    const question = this.getCurrentQuestion();
    return question?.questionText || question?.text || 'Pregunta no disponible';
  }

  getCurrentQuestionCategory(): string {
    const question = this.getCurrentQuestion();
    return question?.tema || question?.category || question?.legalArea || 'Sin categoría';
  }

  getCurrentQuestionDifficulty(): string {
    const question = this.getCurrentQuestion();
    if (!question) return '';
    
    const difficulty = question['difficulty'] || question['level'];
    
    // Convertir número o string a texto
    if (difficulty === 1 || difficulty === 'basico' || difficulty === 'basic') {
      return 'Básico';
    } else if (difficulty === 2 || difficulty === 'intermedio' || difficulty === 'intermediate') {
      return 'Intermedio';
    } else if (difficulty === 3 || difficulty === 'avanzado' || difficulty === 'advanced') {
      return 'Avanzado';
    }
    
    return 'Intermedio'; // Por defecto
  }

  shouldShowDifficultyLevel(): boolean {
    return true;
  }
  
  getCurrentQuestionOptions(): string[] {
    const question = this.getCurrentQuestion();
    
    if (!question) {
      console.warn('⚠️ No hay pregunta actual');
      return [];
    }

    // Verdadero/Falso
    if (this.isTrueFalseQuestion()) {
      return ['Verdadero', 'Falso'];
    }

    // Selección múltiple
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

    // SI NO TIENE OPCIONES VÁLIDAS
    console.error('✗ Pregunta sin opciones válidas:', question);
    
    if (!question.userAnswer) {
      question.userAnswer = 'SKIP';
    }
    
    return [];
  }

  // ✅ NUEVO MÉTODO: Obtener la letra (Id) de una opción por su texto
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
      
      const correctionConfig = localStorage.getItem('correctionConfig');
      const showImmediateCorrection = correctionConfig 
        ? JSON.parse(correctionConfig).immediate 
        : true;
      
      if (showImmediateCorrection) {
        question.wasAnswered = true;
        question.wasCorrect = isCorrect;
        
        // ✓ Log solo aquí
        console.log(`${isCorrect ? '✓' : '✗'} V/F: "${optionText}" → ${answerForBackend} (correcta: ${question.correctAnswer})`);
        
        // Mostrar panel de evaluación
        this.showEvaluationPanel(question, optionText, isCorrect);
      } else {
        question.wasAnswered = true;
        question.wasCorrect = undefined;
      }
      
      await this.sendAnswerToBackend(question, answerForBackend);
      this.cdr.detectChanges();
      return;
    }
    
    // Selección múltiple
    const letterFromBackend = this.getOptionLetterByText(optionText);
    
    if (letterFromBackend) {
      normalizedAnswer = letterFromBackend;
    } else {
      const options = this.getCurrentQuestionOptions();
      const optionIndex = options.indexOf(optionText);
      
      if (optionIndex !== -1) {
        normalizedAnswer = String.fromCharCode(65 + optionIndex);
      } else {
        console.error('✗ No se encontró la opción en el array');
        return;
      }
    }
    
    question.userAnswer = normalizedAnswer;
    
    const isCorrect = this.compareAnswers(normalizedAnswer, question.correctAnswer);
    
    const correctionConfig = localStorage.getItem('correctionConfig');
    const showImmediateCorrection = correctionConfig 
      ? JSON.parse(correctionConfig).immediate 
      : true;
    
    if (showImmediateCorrection) {
      question.wasAnswered = true;
      question.wasCorrect = isCorrect;
      
      // ✓ Log solo aquí
      console.log(`${isCorrect ? '✓' : '✗'} Opción ${normalizedAnswer}: "${optionText}" (correcta: ${question.correctAnswer})`);
      
      // Mostrar panel de evaluación
      this.showEvaluationPanel(question, optionText, isCorrect);
    } else {
      question.wasAnswered = true;
      question.wasCorrect = undefined;
    }
    
    await this.sendAnswerToBackend(question, normalizedAnswer);
    this.cdr.detectChanges();
  }

  async showExplanationAlert(explanation: string) {
    const alert = await this.alertController.create({
      header: '💡 Explicación',
      message: explanation,
      cssClass: 'explanation-alert',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Entendido',
          cssClass: 'alert-button-confirm',
          role: 'confirm'
        }
      ]
    });

    await alert.present();

    setTimeout(() => {
      const alertElement = document.querySelector('ion-alert.explanation-alert');
      if (alertElement) {
        const wrapper = alertElement.shadowRoot?.querySelector('.alert-wrapper') as HTMLElement;
        const head = alertElement.shadowRoot?.querySelector('.alert-head') as HTMLElement;
        const message = alertElement.shadowRoot?.querySelector('.alert-message') as HTMLElement;
        const buttonGroup = alertElement.shadowRoot?.querySelector('.alert-button-group') as HTMLElement;
        const buttons = alertElement.shadowRoot?.querySelectorAll('.alert-button');

        if (wrapper) {
          wrapper.style.background = 'linear-gradient(135deg, rgba(255, 111, 0, 0.95) 0%, rgba(251, 146, 60, 0.95) 100%)';
          wrapper.style.backdropFilter = 'blur(10px)';
          wrapper.style.borderRadius = '20px';
          wrapper.style.boxShadow = '0 8px 32px rgba(255, 111, 0, 0.5)';
          wrapper.style.border = '2px solid rgba(255, 255, 255, 0.2)';
          wrapper.style.maxWidth = '90%';
        }

        if (head) {
          head.style.padding = '24px 20px 16px 20px';
          head.style.textAlign = 'center';
          head.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
          const h2 = head.querySelector('h2');
          if (h2) {
            h2.style.color = 'white';
            h2.style.fontSize = '22px';
            h2.style.fontWeight = '700';
            h2.style.margin = '0';
            h2.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }
        }

        if (message) {
          message.style.padding = '20px';
          message.style.color = 'white';
          message.style.fontSize = '16px';
          message.style.lineHeight = '1.7';
          message.style.textAlign = 'left';
          message.style.maxHeight = '50vh';
          message.style.overflowY = 'auto';
          message.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
        }

        if (buttonGroup) {
          buttonGroup.style.padding = '16px 20px 20px 20px';
          buttonGroup.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        }

        buttons?.forEach((button) => {
          const btn = button as HTMLElement;
          btn.style.background = 'white';
          btn.style.color = '#FF6F00';
          btn.style.borderRadius = '12px';
          btn.style.fontWeight = '700';
          btn.style.fontSize = '16px';
          btn.style.padding = '14px 24px';
          btn.style.margin = '0';
          btn.style.height = 'auto';
          btn.style.textTransform = 'none';
          btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

          const inner = btn.querySelector('.alert-button-inner') as HTMLElement;
          if (inner) {
            inner.style.color = '#FF6F00';
            inner.style.fontWeight = '700';
          }
        });
      }
    }, 100);
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
      
      console.log('📝 Enviando respuesta al backend:', answerData);
      
      await this.apiService.submitAnswer(answerData).toPromise();
      console.log('✓ Respuesta enviada correctamente');
      
    } catch (error) {
      console.error('✗ Error enviando respuesta:', error);
    }
  }

  compareAnswers(userAnswer: string, correctAnswer: string): boolean {
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    // Comparación directa
    if (normalizedUser === normalizedCorrect) return true;
    
    // Mapeo de variantes de Verdadero
    const trueVariants = ['v', 'verdadero', 'true', 'a'];
    const falseVariants = ['f', 'falso', 'false', 'b'];
    
    const userIsTrue = trueVariants.includes(normalizedUser);
    const correctIsTrue = trueVariants.includes(normalizedCorrect);
    const userIsFalse = falseVariants.includes(normalizedUser);
    const correctIsFalse = falseVariants.includes(normalizedCorrect);
    
    if (userIsTrue && correctIsTrue) return true;
    if (userIsFalse && correctIsFalse) return true;
    
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
      
      // Ocultar panel de evaluación al cambiar de pregunta
      this.closeEvaluation();
      
      console.log(`▶ Avanzando a pregunta ${this.currentQuestionNumber} de ${this.totalQuestions}`);
    } else {
      this.finishTest();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.currentQuestionNumber--;
      this.selectedAnswer = '';
      
      // Ocultar panel de evaluación al cambiar de pregunta
      this.closeEvaluation();
      
      console.log(`◀ Retrocediendo a pregunta ${this.currentQuestionNumber} de ${this.totalQuestions}`);
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
    
    if (this.isTrueFalseQuestion()) {
      // ✅ CORREGIDO: Usar la letra del backend también para V/F
      const letterFromBackend = this.getOptionLetterByText(optionText);
      if (letterFromBackend) {
        return question.userAnswer === letterFromBackend;
      }
      
      // Fallback tradicional
      if (question.userAnswer === 'V' && optionText === 'Verdadero') return true;
      if (question.userAnswer === 'F' && optionText === 'Falso') return true;
      return false;
    }
    
    // ✅ CORREGIDO: Usar la letra del backend en lugar del índice
    const letterFromBackend = this.getOptionLetterByText(optionText);
    if (letterFromBackend) {
      return question.userAnswer === letterFromBackend;
    }
    
    // Fallback al método anterior
    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(optionText);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.userAnswer === letter;
    }
    
    return false;
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
      const letterFromBackend = this.getOptionLetterByText(optionText);
      if (!letterFromBackend) return 'default';
      
      const isCorrect = this.compareAnswers(letterFromBackend, question.correctAnswer);
      const isSelected = question.userAnswer === letterFromBackend;
      
      if (isSelected) {
        return isCorrect ? 'correct' : 'incorrect';
      }
      
      if (isCorrect) return 'correct';
      
      return 'default';
    }

    const letterFromBackend = this.getOptionLetterByText(optionText);
    if (!letterFromBackend) return 'default';

    const optionLetter = letterFromBackend;
    
    const isCorrect = this.compareAnswers(optionLetter, question.correctAnswer);
    const isSelected = question.userAnswer === optionLetter;
    
    if (isSelected) {
      return isCorrect ? 'correct' : 'incorrect';
    }
    
    if (isCorrect) return 'correct';
    
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
      
      console.log('📚 Resultados calculados:', results);
      
      const currentSession = this.apiService.getCurrentSession();
      if (currentSession && currentSession.testId) {
        try {
          const response = await this.apiService.finishTest(currentSession.testId).toPromise();
          console.log('✓ Test guardado en BD:', response);
        } catch (error) {
          console.error('✗ Error guardando test en BD:', error);
        }
      }
      
      localStorage.setItem('current_test_results', JSON.stringify(results));
      
      await loading.dismiss();
      
      this.apiService.clearCurrentSession();
      
      console.log('🏁 Navegando a resumen...');
      await this.router.navigate(['/civil/civil-escrito/resumen-test-civil']);
      
    } catch (error) {
      console.error('✗ Error finalizando test:', error);
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
      
      await loading.dismiss();
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

    console.log('📚 Resultados finales:', {
      correctAnswers,
      incorrectAnswers,
      percentage,
      allQuestions: allQuestions.length
    });

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

  // ✅ ACTUALIZADO: Reemplazar preguntas inválidas
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
        console.error('✗ Error obteniendo pregunta de reemplazo:', error);
        this.autoSkipQuestion();
      }
    }
  }

  // ✅ NUEVO: Método para solicitar pregunta de reemplazo
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

  // ✅ NUEVO: Saltar automáticamente si no hay reemplazo
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

  // =====================
  // PANEL DE EVALUACIÓN (como test-oral)
  // =====================
  
  showEvaluationPanel(question: Question, userAnswerText: string, isCorrect: boolean) {
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
}
// FIN DEL ARCHIVO - Copiar hasta aquí
