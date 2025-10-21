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
  type: number;
  category: string;
  legalArea: string;
  difficulty: number;
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
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
      console.log('📥 Cargando preguntas desde el backend...');
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
          console.log('📝 Primera pregunta:', this.questions[0]);
          
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
    return this.hasRecording && !!this.userAnswers[this.getCurrentQuestion()?.id || ''];
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
      type: q.tipo || q.type || 3,
      category: q.tema || q.category || 'Derecho Civil',
      tema: q.tema || q.category || 'Derecho Civil',
      legalArea: q.legalArea || 'Derecho Civil',
      difficulty: q.nivel || q.difficulty || 2,
      correctAnswer: q.respuesta_modelo || q.correctAnswer || '',
      explanation: q.explicacion || q.explanation || 'Sin explicación disponible',
      userAnswer: ''
    }));
  }

  playAudio() {
    const question = this.getCurrentQuestion();
    if (!question || !question.questionText) {
      console.warn('⚠️ No hay pregunta para reproducir');
      return;
    }

    console.log('🔊 Reproduciendo pregunta con voz:', question.questionText);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(question.questionText);
      
      const voices = window.speechSynthesis.getVoices();
      
      const preferredVoices = [
        'Jorge',
        'Monica',
        'Juan',
        'Paulina',
        'Diego',
        'Google español',
        'es-ES',
        'es-MX',
        'es-AR'
      ];
      
      let selectedVoice = null;
      
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(v => 
          v.name.includes(voiceName) || 
          v.lang.includes('es')
        );
        if (selectedVoice) {
          console.log('✅ Voz seleccionada:', selectedVoice.name);
          break;
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'es-ES';
      }
      
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isPlaying = true;
        this.audioCompleted = false;
        this.audioProgress = 'Reproduciendo...';
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.audioCompleted = true;
        this.audioProgress = 'Completado';
        
        this.questionReadyTime = Date.now();
        this.startResponseTimer();
        
        console.log('⏱️ INTERROGATORIO INICIADO');
        this.cdr.detectChanges();
      };

      utterance.onerror = (error) => {
        console.error('❌ Error reproduciendo voz:', error);
        this.isPlaying = false;
        this.audioCompleted = true;
        this.audioProgress = 'Error';
        this.cdr.detectChanges();
      };

      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const newVoices = window.speechSynthesis.getVoices();
          const spanishVoice = newVoices.find(v => v.lang.includes('es'));
          if (spanishVoice) {
            utterance.voice = spanishVoice;
            utterance.lang = spanishVoice.lang;
          }
          window.speechSynthesis.speak(utterance);
        };
      } else {
        window.speechSynthesis.speak(utterance);
      }
      
    } else {
      console.warn('⚠️ speechSynthesis no disponible, usando fallback');
      this.isPlaying = true;
      
      setTimeout(() => {
        this.isPlaying = false;
        this.audioCompleted = true;
        this.audioProgress = 'Completado';
        
        this.questionReadyTime = Date.now();
        this.startResponseTimer();
        
        console.log('⏱️ INTERROGATORIO INICIADO (fallback)');
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  pauseAudio() {
    console.log('⏸️ Pausando audio');
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    this.isPlaying = false;
    this.cdr.detectChanges();
  }

  startResponseTimer() {
    if (this.responseTimer) {
      clearInterval(this.responseTimer);
    }
    
    this.responseTimer = setInterval(() => {
      if (this.questionReadyTime > 0) {
        const elapsed = Math.floor((Date.now() - this.questionReadyTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        this.elapsedResponseTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  stopResponseTimer() {
    if (this.responseTimer) {
      clearInterval(this.responseTimer);
      this.responseTimer = null;
    }
  }

  getAudioIcon(): string {
    if (this.isPlaying) return 'pause-circle';
    if (this.audioCompleted) return 'checkmark-circle';
    return 'play-circle';
  }

  getAudioStatus(): string {
    if (this.isPlaying) return 'Reproduciendo...';
    if (this.audioCompleted) return 'Pregunta escuchada';
    return 'Escuchar pregunta';
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

   startRecording() {
  console.log('🎤 Iniciando grabación de respuesta');
  
  // ✅ DETENER LA VOZ DE LA PREGUNTA ANTES DE GRABAR
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.audioCompleted = true;
    this.audioProgress = 'Completado';
  }
  
  if (this.responseStartTime === 0 && this.questionReadyTime > 0) {
    this.responseStartTime = Date.now();
    const thinkingTime = Math.round((this.responseStartTime - this.questionReadyTime) / 1000);
    console.log(`💭 Tiempo de pensamiento: ${thinkingTime} segundos`);
  }
  
  this.audioService.startRecording();
  this.cdr.detectChanges();
}

  stopRecording() {
    console.log('⏹️ Deteniendo grabación');
    this.audioService.stopRecording();
  }

  restartRecording() {
    console.log('🔄 Reiniciando grabación');
    this.audioService.clearRecording();
    this.recordingTime = '00:00';
    this.hasRecording = false;
    this.currentTranscription = '';
    
    setTimeout(() => {
      this.startRecording();
    }, 300);
  }

  replayRecording() {
    if (!this.audioUrl) {
      console.warn('⚠️ No hay audio para reproducir');
      return;
    }
    
    console.log('▶️ Reproduciendo grabación');
    
    if (this.isPlayingRecording && this.recordingAudio) {
      this.recordingAudio.pause();
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
      return;
    }
    
    if (!this.recordingAudio || this.recordingAudio.src !== this.audioUrl) {
      this.recordingAudio = new Audio(this.audioUrl);
      
      this.recordingAudio.onended = () => {
        this.isPlayingRecording = false;
        this.cdr.detectChanges();
      };
      
      this.recordingAudio.onerror = (error) => {
        this.isPlayingRecording = false;
        console.error('❌ Error al reproducir:', error);
        this.cdr.detectChanges();
      };
    }
    
    this.recordingAudio.play()
      .then(() => {
        this.isPlayingRecording = true;
        this.cdr.detectChanges();
      })
      .catch(error => {
        console.error('❌ Error al reproducir audio:', error);
        this.isPlayingRecording = false;
        this.cdr.detectChanges();
      });
  }

  getRecordingIcon(): string {
    return this.isRecording ? 'stop-circle' : 'mic-circle';
  }

  getRecordingStatus(): string {
    if (this.isRecording) return 'Grabando... Habla ahora';
    if (this.hasRecording) return 'Grabación completada';
    return 'Toca para grabar tu respuesta';
  }
  
  getReplayButtonText(): string {
    return this.isPlayingRecording ? 'Pausar' : 'Reproducir';
  }

  private async convertToWav(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const audioContext = new AudioContext();
          const arrayBuffer = e.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const wavBuffer = this.audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  }

  async submitVoiceAnswer() {
    if (!this.hasRecording || !this.audioBlob) {
      const alert = await this.alertController.create({
        header: 'Sin grabación',
        message: 'Por favor, graba tu respuesta antes de enviar.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    const loading = await this.loadingController.create({
      message: 'Procesando tu respuesta...',
      spinner: 'crescent'
    });
    
    await loading.present();

    try {
      console.log('📱 Plataforma:', navigator.userAgent);
      console.log('🎤 Audio original:', {
        type: this.audioBlob.type,
        size: this.audioBlob.size
      });

      console.log('🔄 Convirtiendo audio a WAV...');
      const wavBlob = await this.convertToWav(this.audioBlob);
      console.log('✅ Audio convertido a WAV:', {
        type: wavBlob.type,
        size: wavBlob.size
      });

      const formData = new FormData();
      formData.append('audioFile', wavBlob, 'recording.wav');
      formData.append('testId', this.testId.toString());
      formData.append('preguntaGeneradaId', question.id);
      formData.append('numeroOrden', this.currentQuestionNumber.toString());
      
      console.log('📤 Enviando FormData al backend');

      try {
        const transcriptionResponse = await this.apiService.transcribeAudioDirect(formData).toPromise();
        
        if (transcriptionResponse && transcriptionResponse.transcription) {
          this.currentTranscription = transcriptionResponse.transcription;
          console.log('✅ Transcripción recibida:', this.currentTranscription);
          
          this.userAnswers[question.id] = this.currentTranscription;
          
          const correctionConfig = this.getCorrectionConfig();
          
          if (correctionConfig.immediate) {
            await loading.dismiss();
            await this.evaluateAnswer(question, this.currentTranscription);
          } else {
            await loading.dismiss();
            const alert = await this.alertController.create({
              header: '✅ Respuesta Guardada',
              message: 'Tu respuesta ha sido guardada. Se evaluará al final del test.',
              buttons: ['OK']
            });
            await alert.present();
          }
        } else {
          await loading.dismiss();
          const alert = await this.alertController.create({
            header: 'Error',
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
}