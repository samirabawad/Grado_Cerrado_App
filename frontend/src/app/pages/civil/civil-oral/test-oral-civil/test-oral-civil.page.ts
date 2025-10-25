import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AudioService, AudioRecordingState } from '../../../../services/audio';
import { ApiService } from '../../../../services/api.service';

interface Question {
  id: string;
  text: string;
  questionText: string;
  type: number | string; 
  category: string;
  legalArea: string;
  difficulty: number;
  correctAnswer: string;
  explanation: string;
  options?: any[];
  userAnswer?: string;
  isAnswered?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-test-oral-civil',
  templateUrl: './test-oral-civil.page.html',
  styleUrls: ['./test-oral-civil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
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
  ]
})
export class TestOralCivilPage implements OnInit, OnDestroy {

  questions: Question[] = [];
  currentQuestionNumber: number = 1;
  totalQuestions: number = 5;
  userAnswers: { [key: string]: string } = {};
  questionEvaluations: { [key: string]: { isCorrect: boolean, correctAnswer: string, explanation: string } } = {};
    
  isPlaying: boolean = false;
  audioCompleted: boolean = false;
  audioProgress: string = '00:02';
  currentAudio: HTMLAudioElement | null = null;
  
  isRecording: boolean = false;
  hasRecording: boolean = false;
  recordingTime: string = '00:00';
  recordingDuration: number = 0;
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  isPlayingRecording: boolean = false;
  recordingAudio: HTMLAudioElement | null = null;

  private questionStartTime: number = 0;
  private recordingStateSubscription: Subscription | null = null;

  public questionReadyTime: number = 0;
  public responseStartTime: number = 0;
  public questionResponseTime: number = 0;
  
  private responseTimer: any;
  public elapsedResponseTime: string = '00:00';
  
  sessionId: string = '';
  testId: number = 0;
  private currentSession: any = null;
  isLoading: boolean = true;
  loadingError: boolean = false;
  currentTranscription: string = '';
  
  showEvaluation: boolean = false;
  evaluationResult: any = null;
  isPlayingExplanation: boolean = false;
  selectedOptionForCurrentQuestion: string | null = null;
  showCorrectAnswer: boolean = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private audioService: AudioService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.sessionId = 'session_' + Date.now();
    
    await this.loadQuestionsFromBackend();
    
    if (!this.audioService.isRecordingSupported()) {
      await this.showUnsupportedAlert();
      return;
    }
    
    const initialized = await this.audioService.initializeRecording();
    if (!initialized) {
      await this.showMicrophoneErrorAlert();
      return;
    }
    
    this.recordingStateSubscription = this.audioService.recordingState$.subscribe(
      (state: AudioRecordingState) => {
        this.isRecording = state.isRecording;
        this.recordingDuration = state.recordingDuration;
        this.audioBlob = state.audioBlob;
        this.audioUrl = state.audioUrl;
        this.hasRecording = state.audioBlob !== null && state.audioBlob.size > 0;
        
        if (this.isRecording || this.hasRecording) {
          this.recordingTime = this.audioService.formatDuration(state.recordingDuration);
        }
        
        this.cdr.detectChanges();
      }
    );
  }

  async loadQuestionsFromBackend() {
    try {
      console.log('🔥 Cargando preguntas desde el backend...');
      this.isLoading = true;
      
      const session = this.apiService.getCurrentSession();
      
      if (!session || !session.questions || session.questions.length === 0) {
        console.error('❌ No hay sesión activa o no tiene preguntas');
        this.loadingError = true;
        this.isLoading = false;
        return;
      }

      console.log('✅ Sesión encontrada:', session);
      
      this.testId = session.testId || session.session?.id || 0;
      this.sessionId = session.session?.id?.toString() || '';
      
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
          
          console.log('✅ Preguntas cargadas:', this.questions.length);
          console.log('🔍 Primera pregunta:', this.questions[0]);
          
          this.isLoading = false;
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.playAudio();
          }, 500);
          
        } catch (error) {
          console.error('❌ Error procesando preguntas:', error);
          this.loadingError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error cargando preguntas:', error);
      this.loadingError = true;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.responseTimer) {
      clearInterval(this.responseTimer);
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (this.recordingStateSubscription) {
      this.recordingStateSubscription.unsubscribe();
    }
    
    this.audioService.clearRecording();
  }

  getCurrentQuestion(): Question | null {
    if (!this.questions || this.questions.length === 0) {
      return null;
    }
    const index = this.currentQuestionNumber - 1;
    return this.questions[index] || null;
  }

  canGoToNext(): boolean {
    return this.hasAnsweredCurrentQuestion();
  }

  isLastQuestion(): boolean {
    return this.currentQuestionNumber === this.totalQuestions;
  }

  async confirmExit() {
    const alert = await this.alertController.create({
      header: 'Abandonar Test',
      message: '¿Estás seguro que deseas abandonar el test? Se perderá tu progreso.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Abandonar',
          role: 'confirm',
          handler: () => {
            this.exitTest();
          }
        }
      ]
    });

    await alert.present();
  }

  exitTest() {
    this.router.navigate(['/civil/civil-oral']);
  }

  convertBackendQuestions(backendQuestions: any[]): Question[] {
    return backendQuestions.map((q: any) => ({
      id: q.id?.toString() || Math.random().toString(),
      text: q.texto_pregunta || q.questionText || q.text || '',
      questionText: q.texto_pregunta || q.questionText || q.text || '',
      type: q.tipo || q.type || 1,
      category: q.tema || q.category || 'Derecho Civil',
      tema: q.tema || q.category || 'Derecho Civil',
      legalArea: q.legalArea || 'Derecho Civil',
      difficulty: q.nivel || q.difficulty || 2,
      correctAnswer: q.respuesta_correcta || q.correctAnswer || '',
      explanation: q.explicacion || q.explanation || 'Sin explicación disponible',
      options: q.opciones || q.options || [],
      userAnswer: '',
      isAnswered: false
    }));
  }

  playAudio() {
    const question = this.getCurrentQuestion();
    if (!question || !question.questionText) {
      console.warn('⚠️ No hay pregunta para reproducir');
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      this.isPlaying = true;
      this.audioCompleted = false;
      this.cdr.detectChanges();

      // Construir el texto completo: pregunta + alternativas
      let fullText = question.questionText;
      
      const options = this.getCurrentQuestionOptions();
      if (options.length > 0) {
        fullText += '. Las alternativas son: ';
        options.forEach((option, index) => {
          const letter = this.getOptionLetter(index);
          fullText += `${letter}, ${option}. `;
        });
      }

      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      // Intentar seleccionar una voz femenina en español
      const voices = window.speechSynthesis.getVoices();
      const femaleSpanishVoice = voices.find(voice => 
        voice.lang.includes('es') && voice.name.toLowerCase().includes('female')
      ) || voices.find(voice => 
        voice.lang.includes('es') && voice.name.toLowerCase().includes('monica')
      ) || voices.find(voice => 
        voice.lang.includes('es') && voice.name.toLowerCase().includes('paulina')
      ) || voices.find(voice => 
        voice.lang.includes('es')
      );

      if (femaleSpanishVoice) {
        utterance.voice = femaleSpanishVoice;
      }

      utterance.onstart = () => {
        console.log('🔊 Iniciando reproducción de audio');
        this.isPlaying = true;
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        console.log('✅ Audio completado');
        this.isPlaying = false;
        this.audioCompleted = true;
        this.cdr.detectChanges();
      };

      utterance.onerror = (event) => {
        console.error('❌ Error en síntesis de voz:', event);
        this.isPlaying = false;
        this.cdr.detectChanges();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.error('❌ speechSynthesis no disponible');
    }
  }

  pauseAudio() {
    if ('speechSynthesis' in window && this.isPlaying) {
      window.speechSynthesis.cancel();
      this.isPlaying = false;
      this.cdr.detectChanges();
    }
  }

  getAudioIcon(): string {
    if (this.isPlaying) return 'pause-circle';
    if (this.audioCompleted) return 'checkmark-circle';
    return 'play-circle';
  }

  getAudioStatus(): string {
    if (this.isPlaying) return 'Reproduciendo pregunta...';
    if (this.audioCompleted) return 'Audio completado';
    return 'Escuchar pregunta';
  }

  async toggleRecording() {
    if (this.isRecording) {
      await this.audioService.stopRecording();
    } else {
      this.audioService.clearRecording();
      await this.audioService.startRecording();
      this.startResponseTimer();
    }
  }

  getRecordingIcon(): string {
    if (this.isRecording) return 'stop-circle';
    if (this.hasRecording) return 'checkmark-circle';
    return 'mic';
  }

  getRecordingStatus(): string {
    if (this.isRecording) return 'Grabando...';
    if (this.hasRecording) return 'Grabación completada';
    return 'Mantén presionado para grabar';
  }

  async replayRecording() {
    if (!this.audioUrl) return;

    if (this.isPlayingRecording && this.recordingAudio) {
      this.recordingAudio.pause();
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
    }

    this.recordingAudio = new Audio(this.audioUrl);
    this.isPlayingRecording = true;

    this.recordingAudio.onended = () => {
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
    };

    this.recordingAudio.onerror = (error) => {
      console.error('Error reproduciendo grabación:', error);
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
    };

    try {
      await this.recordingAudio.play();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al reproducir:', error);
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
    }
  }

  getReplayButtonText(): string {
    return this.isPlayingRecording ? 'Pausar' : 'Reproducir';
  }

  async restartRecording() {
    this.audioService.clearRecording();
    this.stopResponseTimer();
    this.cdr.detectChanges();
  }

  startResponseTimer() {
    this.responseStartTime = Date.now();
    this.elapsedResponseTime = '00:00';
    
    this.responseTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.responseStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.elapsedResponseTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      this.cdr.detectChanges();
    }, 1000);
  }

  stopResponseTimer() {
    if (this.responseTimer) {
      clearInterval(this.responseTimer);
      this.responseTimer = null;
    }
  }

  playExplanationAudio() {
    if (!this.evaluationResult?.explanation) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(this.evaluationResult.explanation);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;

      utterance.onstart = () => {
        this.isPlayingExplanation = true;
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        this.isPlayingExplanation = false;
        this.cdr.detectChanges();
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  pauseExplanationAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isPlayingExplanation = false;
      this.cdr.detectChanges();
    }
  }

  async submitVoiceAnswer() {
    if (!this.audioBlob) {
      const alert = await this.alertController.create({
        header: 'Sin audio',
        message: 'No hay audio grabado para transcribir.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Transcribiendo tu respuesta...',
      spinner: 'crescent'
    });
    
    await loading.present();

    try {
      const audioFile = new File([this.audioBlob], 'recording.webm', { type: this.audioBlob.type });
      
      try {
        const transcriptionResponse = await this.apiService.transcribeAudio(audioFile as any).toPromise();        
        await loading.dismiss();

        if (transcriptionResponse && transcriptionResponse.success && transcriptionResponse.data) {
          const transcription = transcriptionResponse.data.text || transcriptionResponse.data;
          
          console.log('✅ Transcripción recibida:', transcription);
          
          this.currentTranscription = transcription;
          
          const question = this.getCurrentQuestion();
          if (question) {
            question.userAnswer = transcription;
            this.userAnswers[question.id] = transcription;
            
            await this.evaluateAnswer(question, transcription);
          }
          
        } else {
          const alert = await this.alertController.create({
            header: 'Error de transcripción',
            message: 'No se pudo transcribir el audio. Por favor, intenta de nuevo.',
            buttons: ['OK']
          });
          await alert.present();
        }
      } catch (error: any) {
        console.error('❌ Error transcribiendo:', error);
        await loading.dismiss();
        
        let errorMessage = 'Hubo un error al procesar tu respuesta.';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        }
        
        const alert = await this.alertController.create({
          header: 'Error de Transcripción',
          message: errorMessage,
          buttons: ['OK']
        });
        await alert.present();
      }
      
    } catch (error) {
      console.error('❌ Error convirtiendo audio:', error);
      await loading.dismiss();
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudo convertir el audio. Intenta grabar de nuevo.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  getCorrectionConfig(): any {
    try {
      const saved = localStorage.getItem('correctionConfig');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error leyendo correctionConfig:', error);
    }
    return { immediate: true };
  }

  async evaluateAnswer(question: Question, transcription: string) {
    const loading = await this.loadingController.create({
      message: 'Evaluando tu respuesta...',
      spinner: 'crescent'
    });
    
    await loading.present();

    try {
      const evaluationData = {
        testId: this.testId,
        preguntaGeneradaId: parseInt(question.id),
        numeroOrden: this.currentQuestionNumber,
        transcription: transcription
      };

      console.log('📊 Datos de evaluación:', evaluationData);

      const response = await this.apiService.evaluateOralAnswer(evaluationData).toPromise();
      
      console.log('✅ Respuesta completa del backend:', response);

      await loading.dismiss();

      if (response && response.success) {
        const data = response.data || response;
        
        this.evaluationResult = {
          isCorrect: data.isCorrect || false,
          userAnswer: transcription,
          correctAnswer: data.correctAnswer || question.correctAnswer,
          explanation: data.explanation || data.explicacion || question.explanation
        };

        this.questionEvaluations[question.id] = {
          isCorrect: this.evaluationResult.isCorrect,
          correctAnswer: this.evaluationResult.correctAnswer,
          explanation: this.evaluationResult.explanation
        };
        
        this.showEvaluation = true;
        this.cdr.detectChanges();
      }
      
    } catch (error: any) {
      console.error('❌ Error evaluando respuesta:', error);
      await loading.dismiss();
      
      this.evaluationResult = {
        isCorrect: false,
        userAnswer: transcription,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
      
      this.showEvaluation = true;
      this.cdr.detectChanges();
    }
  }

  nextQuestion() {
    if (!this.canGoToNext()) {
      console.warn('⚠️ No se puede avanzar sin respuesta guardada');
      return;
    }
    
    if (this.isLastQuestion()) {
      this.completeTest();
    } else {
      this.currentQuestionNumber++;
      this.resetQuestionState();
    }
  }

  previousQuestion() {
    if (this.currentQuestionNumber > 1) {
      this.currentQuestionNumber--;
      this.resetQuestionState();
    }
  }

  resetQuestionState() {
    this.isPlaying = false;
    this.audioCompleted = false;
    this.audioProgress = '00:02';
    this.currentTranscription = '';
    this.showEvaluation = false;
    this.evaluationResult = null;
    this.showCorrectAnswer = false;
    this.selectedOptionForCurrentQuestion = null;
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
      this.isPlayingRecording = false;
    }
    
    this.audioService.clearRecording();
    
    this.stopResponseTimer();
    this.questionReadyTime = 0;
    this.responseStartTime = 0;
    this.questionResponseTime = 0;
    this.elapsedResponseTime = '00:00';
    
    console.log('🔄 Estado reseteado para pregunta', this.currentQuestionNumber);
    
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.playAudio();
      console.log('🔊 Reproduciendo automáticamente pregunta', this.currentQuestionNumber);
    }, 300);
  }

async completeTest() {
  console.log('🏁 Completando test oral');
  
  const loading = await this.loadingController.create({
    message: 'Finalizando test...',
    spinner: 'crescent'
  });
  
  await loading.present();
  
  try {
    let correctCount = 0;
    let incorrectCount = 0;
    const questionDetails: any[] = [];
    
    // Recorrer todas las preguntas y obtener sus evaluaciones
    this.questions.forEach((q, index) => {
      const questionId = q.id;
      const evaluation = this.questionEvaluations[questionId];
      
      if (evaluation && evaluation.isCorrect !== undefined) {
        if (evaluation.isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
        
        questionDetails.push({
          questionNumber: index + 1,
          questionText: q.questionText,
          correct: evaluation.isCorrect
        });
      } else {
        // Si no hay evaluación, contar como incorrecta
        incorrectCount++;
        questionDetails.push({
          questionNumber: index + 1,
          questionText: q.questionText,
          correct: false
        });
      }
    });
    
    const totalAnswered = correctCount + incorrectCount;
    const percentage = totalAnswered > 0 
      ? Math.round((correctCount / this.totalQuestions) * 100) 
      : 0;
    
    const results = {
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      totalQuestions: this.totalQuestions,
      percentage: percentage,
      timeUsedFormatted: '0:00 min',
      questionDetails: questionDetails
    };
    
    localStorage.setItem('current_oral_test_results', JSON.stringify(results));
    console.log('✅ Resultados guardados:', results);
    
    await loading.dismiss();
    
    await this.router.navigate(['/civil/civil-oral/resumen-test-civil-oral']);
    
  } catch (error) {
    console.error('❌ Error completando test:', error);
    await loading.dismiss();
    
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Hubo un error al finalizar el test',
      buttons: ['OK']
    });
    await alert.present();
  }
}

  async showUnsupportedAlert() {
    const alert = await this.alertController.create({
      header: 'Grabación no disponible',
      message: 'Tu navegador no soporta la grabación de audio. Por favor, usa Chrome, Firefox o Safari.',
      buttons: [{
        text: 'OK',
        handler: () => {
          this.router.navigate(['/civil/civil-oral']);
        }
      }]
    });
    await alert.present();
  }

  async showMicrophoneErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Permiso de micrófono',
      message: 'No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono en la configuración de tu navegador.',
      buttons: [{
        text: 'OK',
        handler: () => {
          this.router.navigate(['/civil/civil-oral']);
        }
      }]
    });
    await alert.present();
  }

  getCurrentQuestionOptions(): string[] {
    const question = this.getCurrentQuestion();
    
    if (!question) {
      return [];
    }

    // Verdadero/Falso
    if (question.type == 2 || question.type == '2') {
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

    return [];
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isOptionSelected(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !question.userAnswer) return false;

    // Verdadero/Falso
    if (question.type === 2 || question.type === '2') {
      if (question.userAnswer === 'V' && option === 'Verdadero') return true;
      if (question.userAnswer === 'F' && option === 'Falso') return true;
      return false;
    }

    // Selección múltiple
    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(option);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.userAnswer === letter;
    }

    return false;
  }

  isOptionCorrect(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !this.showCorrectAnswer) return false;

    // Verdadero/Falso
    if (question.type === 2 || question.type === '2') {
      const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
      const isVerdaderoCorrect = correctAnswerNorm === 'true' || 
                                  correctAnswerNorm === 'v' || 
                                  correctAnswerNorm === 'verdadero';
      
      if (option === 'Verdadero' && isVerdaderoCorrect) return true;
      if (option === 'Falso' && !isVerdaderoCorrect) return true;
      return false;
    }

    // Selección múltiple
    const options = this.getCurrentQuestionOptions();
    const optionIndex = options.indexOf(option);
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex);
      return question.correctAnswer.toUpperCase() === letter;
    }

    return false;
  }

  isOptionIncorrect(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !this.showCorrectAnswer || !question.userAnswer) return false;

    return this.isOptionSelected(option) && !this.isOptionCorrect(option);
  }

  hasAnsweredCurrentQuestion(): boolean {
    const question = this.getCurrentQuestion();
    return question?.isAnswered === true;
  }

  shouldShowOptionIcon(option: string): boolean {
    return this.showCorrectAnswer && (this.isOptionCorrect(option) || this.isOptionIncorrect(option));
  }

  getOptionIcon(option: string): string {
    if (this.isOptionCorrect(option)) return 'checkmark-circle';
    if (this.isOptionIncorrect(option)) return 'close-circle';
    return '';
  }

  getOptionIconColor(option: string): string {
    if (this.isOptionCorrect(option)) return '#4CAF50';
    if (this.isOptionIncorrect(option)) return '#F44336';
    return '';
  }

  async selectAnswer(optionText: string) {
    if (this.hasAnsweredCurrentQuestion()) {
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    let normalizedAnswer: string;
    
    // Verdadero/Falso
    if (question.type === 2 || question.type === '2') {
      normalizedAnswer = optionText === 'Verdadero' ? 'V' : 'F';
    } else {
      // Selección múltiple
      const options = this.getCurrentQuestionOptions();
      const optionIndex = options.indexOf(optionText);
      
      if (optionIndex !== -1) {
        normalizedAnswer = String.fromCharCode(65 + optionIndex);
      } else {
        return;
      }
    }
    
    question.userAnswer = normalizedAnswer;
    question.isAnswered = true;
    this.userAnswers[question.id] = normalizedAnswer;
    
    // Mostrar si es correcto o incorrecto
    const isCorrect = this.compareAnswers(normalizedAnswer, question.correctAnswer);
    
    this.evaluationResult = {
      isCorrect: isCorrect,
      userAnswer: optionText,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    };

    this.questionEvaluations[question.id] = {
      isCorrect: isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    };
    
    this.showCorrectAnswer = true;
    this.showEvaluation = true;
    this.cdr.detectChanges();
  }

  compareAnswers(userAnswer: string, correctAnswer: string): boolean {
    const userNorm = userAnswer.toUpperCase().trim();
    const correctNorm = correctAnswer.toUpperCase().trim();
    
    return userNorm === correctNorm;
  }
}