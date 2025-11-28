import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AudioService, AudioRecordingState } from '../../../../services/audio';
import { VoiceRecorder, VoiceRecorderPlugin, RecordingData, GenericResponse } from 'capacitor-voice-recorder';
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
  responseMethod: 'voice' | 'selection' = 'voice';

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
    
// PRIMERO cargar la sesión para obtener el responseMethod
const session = this.apiService.getCurrentSession();
if (session) {
  // Buscar responseMethod en TODOS los lugares posibles
  this.responseMethod = session.responseMethod || 
                        session.session?.responseMethod || 
                        session.data?.responseMethod || 
                        'voice';
  console.log('📋 Método de respuesta detectado:', this.responseMethod);
  console.log('📋 Objeto session completo:', JSON.stringify(session, null, 2));
}
    
    await this.loadQuestionsFromBackend();
    
    // Solo inicializar grabación si el método es 'voice'
    if (this.responseMethod === 'voice') {
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
    } else {
      console.log('✅ Modo selección: micrófono NO inicializado');
    }
  }

async loadQuestionsFromBackend() {
    try {
      console.log('📥 Cargando preguntas desde el backend...');
      this.isLoading = true;
      
      const session = this.apiService.getCurrentSession();
      
      console.log('🔍 SESSION COMPLETA:', JSON.stringify(session, null, 2));
      
      if (!session || !session.questions || session.questions.length === 0) {
        console.error('❌ No hay sesión activa o no tiene preguntas');
        this.loadingError = true;
        this.isLoading = false;
        return;
      }

      console.log('✅ Sesión encontrada');
      
      // ⚠️ CRÍTICO: Buscar responseMethod en TODOS los lugares posibles
      this.responseMethod = session.responseMethod || 
                            session.session?.responseMethod || 
                            session.data?.responseMethod || 
                            'voice';
      
      console.log('📋 ResponseMethod detectado:', this.responseMethod);
      console.log('📋 Session keys:', Object.keys(session));
      
      this.testId = session.testId || 
                    session.test?.id || 
                    session.session?.testId || 
                    session.session?.id ||
                    session.id ||
                    0;
      
      this.sessionId = session.sessionId || 
                       session.session?.id?.toString() || 
                       session.id?.toString() || 
                       '';
      
      console.log('🆔 TestId FINAL extraído:', this.testId);
      console.log('🆔 SessionId FINAL extraído:', this.sessionId);
      
      if (this.testId === 0) {
        console.error('⚠️⚠️⚠️ CRÍTICO: testId es 0');
        console.error('⚠️ La estructura de session es:', Object.keys(session));
      }
      
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
          console.log('✅ Método de respuesta activo:', this.responseMethod);
                    
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Reproducir automáticamente en Android
          setTimeout(() => {
            this.playAudio();
          }, 500);
          
        } catch (error) {
          console.error('❌ Error procesando preguntas:', error);
          this.loadingError = true;
          this.isLoading = false;
        }
      }, 300);
      
    } catch (error) {
      console.error('❌ Error en loadQuestionsFromBackend:', error);
      this.loadingError = true;
      this.isLoading = false;
    }
  }


  ngOnDestroy() {
    if (this.recordingStateSubscription) {
      this.recordingStateSubscription.unsubscribe();
    }
    
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
    }
    
    this.audioService.clearRecording();
    this.stopResponseTimer();
  }

  ionViewWillLeave() {
    // Detener el audio TTS cuando se abandona la página
    this.apiService.stopTextToSpeech();
    this.isPlaying = false;
    
    // Detener también el audio de la grabación si está reproduciéndose
    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
      this.isPlayingRecording = false;
    }
  }

  getCurrentQuestion(): Question | null {
    if (!this.questions || this.questions.length === 0) {
      return null;
    }
    return this.questions[this.currentQuestionNumber - 1] || null;
  }

  getCurrentQuestionOptions(): string[] {
    const question = this.getCurrentQuestion();
    if (!question) return [];

    if (question.type == 2 || question.type == '2') {
      return ['Verdadero', 'Falso'];
    }

    if (question.options && Array.isArray(question.options)) {
      return question.options
        .map(opt => {
          // Si la opción es un objeto, extraer el texto
          if (typeof opt === 'object' && opt !== null) {
            return opt.texto || opt.text || opt.option || '';
          }
          // Si es un string, devolverlo directamente
          return String(opt);
        })
        .filter(opt => opt && opt.trim && opt.trim() !== '');
    }

    return [];
  }

  getOptionLetter(index: number): string {
    const question = this.getCurrentQuestion();
    if (question && (question.type == 2 || question.type == '2')) {
      return index === 0 ? 'V' : 'F';
    }
    return String.fromCharCode(65 + index);
  }

isOptionSelected(option: string): boolean {
    if (!this.showEvaluation) {
      return false;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return false;

    const answer = question.userAnswer;
    if (!answer) return false;

    if (question.type == 2 || question.type == '2') {
      if (option === 'Verdadero') {
        return answer === 'V' || answer.toLowerCase() === 'verdadero';
      }
      if (option === 'Falso') {
        return answer === 'F' || answer.toLowerCase() === 'falso';
      }
    } else {
      const options = this.getCurrentQuestionOptions();
      const index = options.indexOf(option);
      if (index !== -1) {
        const expectedLetter = String.fromCharCode(65 + index);
        return answer === expectedLetter;
      }
    }
    return false;
  }

  isOptionCorrect(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !this.showCorrectAnswer) return false;

    const correctAnswer = question.correctAnswer?.toUpperCase().trim();

    if (question.type == 2 || question.type == '2') {
      if (option === 'Verdadero') {
        return correctAnswer === 'V' || correctAnswer === 'VERDADERO';
      }
      if (option === 'Falso') {
        return correctAnswer === 'F' || correctAnswer === 'FALSO';
      }
    } else {
      const options = this.getCurrentQuestionOptions();
      const index = options.indexOf(option);
      if (index !== -1) {
        const optionLetter = String.fromCharCode(65 + index);
        return correctAnswer === optionLetter;
      }
    }
    return false;
  }

  isOptionIncorrect(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !this.showCorrectAnswer) return false;
    
    return this.isOptionSelected(option) && !this.isOptionCorrect(option);
  }

  shouldShowOptionIcon(option: string): boolean {
    return this.showCorrectAnswer && (this.isOptionCorrect(option) || this.isOptionIncorrect(option));
  }

  getOptionIcon(option: string): string {
    if (this.isOptionCorrect(option)) {
      return 'checkmark-circle';
    }
    if (this.isOptionIncorrect(option)) {
      return 'close-circle';
    }
    return '';
  }

  getOptionIconColor(option: string): string {
    if (this.isOptionCorrect(option)) {
      return '#4CAF50';
    }
    if (this.isOptionIncorrect(option)) {
      return '#F44336';
    }
    return '#64748b';
  }

  hasAnsweredCurrentQuestion(): boolean {
    const question = this.getCurrentQuestion();
    if (!question) return false;
    return question.isAnswered === true;
  }

  canGoToNext(): boolean {
    return this.hasAnsweredCurrentQuestion();
  }

  isLastQuestion(): boolean {
    return this.currentQuestionNumber === this.totalQuestions;
  }

async playAudio() {
    if (this.isPlaying) {
      console.log('⏸️ Audio ya está reproduciéndose');
      return;
    }
    
    // Detener cualquier audio previo
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    try {
      this.isPlaying = true;
      this.audioCompleted = false;
      
      const pregunta = this.getCurrentQuestion();
      if (!pregunta) {
        console.error('❌ No hay pregunta actual');
        return;
      }

      const opciones = pregunta['options'] || pregunta['opciones'] || [];
      
      if (opciones.length === 0) {
        console.error('❌ No hay opciones disponibles');
        return;
      }

      // ✅ CONSTRUIR TEXTO CON LETRAS (A, B, C, D)
      const opcionesTexto = opciones
        .map((o: any, i: number) => {
          const letra = String.fromCharCode(65 + i); // A, B, C, D...
          const texto = o.text || o.texto || o;
          return `${letra}. ${texto}`;
        })
        .join('. ');
      
      const textoCompleto = `${pregunta['questionText'] || pregunta['pregunta']}. Las opciones son: ${opcionesTexto}`;
      
      console.log('🎵 Texto a reproducir:', textoCompleto);
      await this.apiService.playTextToSpeech(textoCompleto);
      
      this.isPlaying = false;
      this.audioCompleted = true;
      
    } catch (error: any) {
      console.error('❌ Error reproduciendo:', error.message || error);
      this.isPlaying = false;
    }
  }

  pauseAudio() {
      this.apiService.stopTextToSpeech();
      this.isPlaying = false;
      this.cdr.detectChanges();
    }
  

  

  getAudioIcon(): string {
    if (this.isPlaying) {
      return 'pause-circle';
    }
    if (this.audioCompleted) {
      return 'refresh-circle';
    }
    return 'play-circle';
  }

  getAudioStatus(): string {
    if (this.isPlaying) {
      return 'Reproduciendo...';
    }
    if (this.audioCompleted) {
      return 'Escuchar pregunta';
    }
    return 'Escuchar pregunta';
  }

async toggleRecording() {
    console.log('🎤 Toggle grabación - isPlaying:', this.isPlaying);
    
    // Detener audio de la pregunta si está reproduciéndose
    if (this.isPlaying) {
      console.log('⏸️ Deteniendo audio antes de grabar');
      this.apiService.stopTextToSpeech();
      this.isPlaying = false;
      this.cdr.detectChanges();
    }
    
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  

  // Pedir permisos
  async requestPermissions() {
    const result = await VoiceRecorder.requestAudioRecordingPermission();
    return result.value;
  }


  async startRecording() {
    console.log('🎤 Iniciando grabación...');
    
    // Detener audio de la pregunta si está reproduciéndose
    if (this.isPlaying) {
      this.apiService.stopTextToSpeech();
      this.isPlaying = false;
    }
    
    this.audioService.clearRecording();
    this.hasRecording = false;
    this.audioBlob = null;
    this.audioUrl = null;
    
    await this.audioService.startRecording();
    
    if (!this.responseStartTime) {
      this.startResponseTimer();
    }
    
    this.cdr.detectChanges();
  }

  async stopRecording() {
    console.log('⏹️ Deteniendo grabación...');
    await this.audioService.stopRecording();
    
    this.stopResponseTimer();
    
    if (this.responseStartTime > 0) {
      this.questionResponseTime = Date.now() - this.responseStartTime;
      console.log('⏱️ Tiempo de respuesta:', this.questionResponseTime, 'ms');
    }
    
    this.cdr.detectChanges();
  }

  getRecordingIcon(): string {
    if (this.isRecording) {
      return 'stop-circle';
    }
    if (this.hasRecording) {
      return 'checkmark-circle';
    }
    return 'mic';
  }

  getRecordingStatus(): string {
    if (this.isRecording) {
      return 'Grabando...';
    }
    if (this.hasRecording) {
      return 'Grabación lista';
    }
    return 'Mantén presionado para grabar';
  }

  async replayRecording() {
    if (!this.audioBlob) {
      console.warn('⚠️ No hay audio para reproducir');
      return;
    }

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

    try {
      // Convertir blob a base64 para evitar problemas con CSP
      const reader = new FileReader();
      reader.readAsDataURL(this.audioBlob);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        this.recordingAudio = new Audio(base64data);
        this.isPlayingRecording = true;
        this.cdr.detectChanges();

        this.recordingAudio.onended = () => {
          this.isPlayingRecording = false;
          this.cdr.detectChanges();
        };

        this.recordingAudio.onerror = (error) => {
          console.error('❌ Error reproduciendo grabación:', error);
          this.isPlayingRecording = false;
          this.cdr.detectChanges();
        };

        await this.recordingAudio.play();
        console.log('▶️ Reproduciendo grabación');
      };
    } catch (error) {
      console.error('❌ Error al reproducir:', error);
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
    }
  }

  getReplayButtonText(): string {
    return this.isPlayingRecording ? 'Pausar' : 'Reproducir';
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

async playExplanationAudio() {
  if (!this.evaluationResult?.explanation) return;

  console.log("🔊 Reproduciendo explicación con Azure TTS...");

  await this.apiService.playTextToSpeech(this.evaluationResult.explanation);  this.isPlayingExplanation = true;
}


pauseExplanationAudio() {
  if (this.currentAudio) {
    this.currentAudio.pause();
    this.isPlayingExplanation = false;
    this.cdr.detectChanges();
  }
}


  

  stopAllAudio() {
    // Detener síntesis de voz (pregunta o explicación)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Actualizar estados
    this.isPlaying = false;
    this.isPlayingExplanation = false;
    this.cdr.detectChanges();
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
      message: 'Procesando tu respuesta...',
      spinner: 'crescent'
    });
    
    await loading.present();

    try {
      console.log('🎤 Audio original:', this.audioBlob.type, this.audioBlob.size, 'bytes');
      
      const wavBlob = await this.convertToWav(this.audioBlob);
      console.log('🔄 Audio convertido a WAV:', wavBlob.size, 'bytes');
      
      const formData = new FormData();
      const audioFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
      formData.append('audioFile', audioFile);
      
      console.log('📤 Enviando audio WAV al backend');
      
try {
        const transcriptionResponse = await this.apiService.transcribeAudioDirect(formData).toPromise();
        
        console.log('📥 Respuesta del backend:', transcriptionResponse);
        
        await loading.dismiss();

        // Intentar extraer transcripción de múltiples lugares
        let transcription = '';
        
        if (transcriptionResponse) {
          transcription = transcriptionResponse.transcription || 
                         transcriptionResponse.data?.transcription ||
                         transcriptionResponse.data?.text || 
                         transcriptionResponse.text ||
                         '';
        }
        
        console.log('✅ Transcripción extraída:', transcription);
        
        if (!transcription || transcription.trim() === '') {
          console.error('❌ Transcripción vacía. Respuesta completa:', JSON.stringify(transcriptionResponse));
          
          const alert = await this.alertController.create({
            header: 'No te escuché',
            message: 'El sistema no pudo transcribir tu audio. Asegúrate de:\n• Hablar más fuerte y claro\n• Estar en un lugar silencioso\n• Mantener presionado mientras hablas',
            buttons: ['OK']
          });
          await alert.present();
          
          this.audioService.clearRecording();
          this.cdr.detectChanges();
          return;
        }
        
        this.currentTranscription = transcription;
        
        const detectedOption = this.detectOptionFromTranscription(transcription);
        
        if (detectedOption) {

          await this.selectAnswer(detectedOption);
        } else {
          const alert = await this.alertController.create({
            header: 'No entendí tu respuesta',
            message: `Dijiste: "${transcription}". Di una opción clara como: A, B, C, Verdadero o Falso.`,
            buttons: ['OK']
          });
          await alert.present();
        }

      } catch (error: any) {
        console.error('❌ Error transcribiendo:', error);
        await loading.dismiss();
        
        if (!this.showEvaluation) {
          const alert = await this.alertController.create({
            header: 'Error',
            message: 'Hubo un error al procesar tu respuesta. Intenta de nuevo.',
            buttons: ['OK']
          });
          await alert.present();
        }
      }

      
} catch (error) {
      console.error('❌ Error preparando audio:', error);
      await loading.dismiss();
      // No mostrar alert porque ya se mostró uno más específico antes
    }
  }

  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const wavBlob = this.audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.error('Error decodificando audio:', error);
          reject(error);
        }
      };

      fileReader.onerror = () => reject(new Error('Error leyendo el archivo'));
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = 1;
    const sampleRate = 16000;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const samples = audioBuffer.getChannelData(0);
    const newLength = Math.floor(samples.length * (sampleRate / audioBuffer.sampleRate));
    const resampledData = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const index = i * (samples.length / newLength);
      resampledData[i] = samples[Math.floor(index)];
    }

    const dataLength = resampledData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < resampledData.length; i++) {
      const sample = Math.max(-1, Math.min(1, resampledData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

detectOptionFromTranscription(transcription: string): string | null {
    const text = transcription
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    const question = this.getCurrentQuestion();
    if (!question) return null;

    console.log('🔍 Analizando transcripción:', text);

    // Para Verdadero/Falso
    if (question.type == 2 || question.type == '2') {
      // Buscar "verdadero" o sinónimos
      if (/verdadero|true|correcto|afirmativo|si(?![a-z])|exacto/i.test(text)) {
        console.log('✅ Detectado: Verdadero');
        return 'Verdadero';
      }
      
      // Buscar "falso" o sinónimos
      if (/falso|false|incorrecto|negativo|no(?![a-z])/i.test(text)) {
        console.log('✅ Detectado: Falso');
        return 'Falso';
      }

      // Buscar letra A o variantes (para Verdadero)
      if (/\bah\b|\ba\b|\bla a\b|\bletra a\b|\bopcion a\b|\balternativa a\b/i.test(text)) {
        console.log('✅ Detectado: Verdadero (por letra A)');
        return 'Verdadero';
      }
      
      // Buscar letra B o variantes (para Falso)
      if (/\bbe\b|\bb\b|\bla be\b|\bletra be\b|\bopcion be\b|\balternativa be\b/i.test(text)) {
        console.log('✅ Detectado: Falso (por letra B)');
        return 'Falso';
      }

      console.warn('❌ No se detectó V/F en:', text);
      return null;
    }

    // Para opciones múltiples (A, B, C, D)
    const options = this.getCurrentQuestionOptions();
    
    // Buscar letra A, B, C o D explícitamente
    if (/\bah\b|\ba\b|\bla a\b|\bletra a\b|\bopcion a\b|\balternativa a\b/i.test(text) && options.length > 0) {
      console.log('✅ Detectado: Opción A');
      return options[0];
    }
    if (/\bbe\b|\bb\b|\bla be\b|\bletra be\b|\bopcion be\b|\balternativa be\b/i.test(text) && options.length > 1) {
      console.log('✅ Detectado: Opción B');
      return options[1];
    }
    if (/\bce\b|\bc\b|\bla ce\b|\bletra ce\b|\bopcion ce\b|\balternativa ce\b/i.test(text) && options.length > 2) {
      console.log('✅ Detectado: Opción C');
      return options[2];
    }
    if (/\bde\b|\bd\b|\bla de\b|\bletra de\b|\bopcion de\b|\balternativa de\b/i.test(text) && options.length > 3) {
      console.log('✅ Detectado: Opción D');
      return options[3];
    }

    // Buscar letra al final del texto
    const words = text.split(/\s+/);
    if (words.length > 0) {
      const lastWord = words[words.length - 1];
      
      if (/^ah?$/i.test(lastWord) && options.length > 0) {
        console.log('✅ Detectado: Opción A (al final)');
        return options[0];
      }
      if (/^be?$/i.test(lastWord) && options.length > 1) {
        console.log('✅ Detectado: Opción B (al final)');
        return options[1];
      }
      if (/^ce?$/i.test(lastWord) && options.length > 2) {
        console.log('✅ Detectado: Opción C (al final)');
        return options[2];
      }
      if (/^de?$/i.test(lastWord) && options.length > 3) {
        console.log('✅ Detectado: Opción D (al final)');
        return options[3];
      }
    }

    // Buscar por contenido de la opción
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const optionWords = option
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,;:!?¿¡]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3);
      
      let matches = 0;
      for (const word of optionWords) {
        if (text.includes(word)) {
          matches++;
        }
      }
      
      if (matches >= 2 || (optionWords.length > 0 && matches / optionWords.length > 0.5)) {
        console.log(`✅ Detectado por contenido: Opción ${String.fromCharCode(65 + i)} (${matches} coincidencias)`);
        return option;
      }
    }

    console.warn('❌ No se detectó ninguna opción en:', text);
    return null;
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

  nextQuestion() {
    if (!this.canGoToNext()) {
      console.warn('⚠️ No se puede avanzar sin respuesta guardada');
      return;
    }
    
    // Detener cualquier audio antes de avanzar
    this.stopAllAudio();
    
    if (this.isLastQuestion()) {
      this.completeTest();
    } else {
      this.currentQuestionNumber++;
      this.resetQuestionState();
    }
  }

  previousQuestion() {
    if (this.currentQuestionNumber > 1) {
      // Detener cualquier audio antes de retroceder
      this.stopAllAudio();
      
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
  }

async completeTest() {
    console.log('🏁 Completando test oral civil');
    
    const loading = await this.loadingController.create({
      message: 'Guardando resultados...',
      spinner: 'crescent'
    });
    
    await loading.present();
    
    try {
      let correctCount = 0;
      let incorrectCount = 0;
      const questionDetails: any[] = [];
      
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
            correct: evaluation.isCorrect,
            questionText: q.questionText || q.text || '',
            userAnswer: q.userAnswer || '',
            expectedAnswer: evaluation.correctAnswer || q.correctAnswer || '',
            explanation: evaluation.explanation || q.explanation || '',
            options: q.options || []
          });
        } else {
          incorrectCount++;
          questionDetails.push({
            questionNumber: index + 1,
            correct: false,
            questionText: q.questionText || q.text || '',
            userAnswer: '',
            expectedAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            options: q.options || []
          });
        }
      });

      const percentage = this.totalQuestions > 0 
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
      
      console.log('📊 Resultados calculados:', results);
      
      const currentSession = this.apiService.getCurrentSession();
      if (currentSession && currentSession.testId) {
        try {
          const response = await this.apiService.finishTest(currentSession.testId).toPromise();
          console.log('✅ Test oral guardado en BD:', response);
        } catch (error) {
          console.error('❌ Error guardando test en BD:', error);
        }
      } else {
        console.error('⚠️ No hay testId en currentSession:', currentSession);
      }
      
      localStorage.setItem('current_oral_test_results', JSON.stringify(results));
      
      await loading.dismiss();
      
      this.apiService.clearCurrentSession();
      
      console.log('🎯 Navegando a resumen...');
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
    console.log('🔄 Convirtiendo preguntas del backend...');
    console.log('🔄 Primera pregunta RAW:', JSON.stringify(backendQuestions[0], null, 2));
    
    return backendQuestions.map((q: any, index: number) => {
      const converted = {
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
        options: q.opciones || q.options || q.Opciones || q.Options || [],
        userAnswer: '',
        isAnswered: false
      };
      
      if (index === 0) {
        console.log('✅ Primera pregunta CONVERTIDA:', JSON.stringify(converted, null, 2));
        console.log('✅ Opciones extraídas:', converted.options);
      }
      
      return converted;
    });
  }

async selectOptionByClick(optionText: string) {
    if (this.hasAnsweredCurrentQuestion()) {
      console.warn('⚠️ Ya se respondió esta pregunta');
      return;
    }
    
    console.log('🖱️ Opción seleccionada por click:', optionText);
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    let normalizedAnswer: string;
    
    if (question.type == 2 || question.type == '2') {
      normalizedAnswer = optionText === 'Verdadero' ? 'V' : 'F';
    } else {
      const options = this.getCurrentQuestionOptions();
      const optionIndex = options.indexOf(optionText);
      
      if (optionIndex !== -1) {
        normalizedAnswer = String.fromCharCode(65 + optionIndex);
      } else {
        return;
      }
    }

    this.selectedOptionForCurrentQuestion = optionText;
    question.userAnswer = normalizedAnswer;
    this.cdr.detectChanges();

    setTimeout(async () => {
      await this.selectAnswer(optionText);
    }, 100);
  }

async selectAnswer(optionText: string) {
    if (this.hasAnsweredCurrentQuestion()) {
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;

    let normalizedAnswer: string;
    
    if (question.type == 2 || question.type == '2') {
      normalizedAnswer = optionText === 'Verdadero' ? 'V' : 'F';
    } else {
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
    
    // 🆕 GUARDAR LA RESPUESTA EN EL BACKEND
    await this.saveAnswerToBackend(question, normalizedAnswer, isCorrect);
    
    this.showCorrectAnswer = true;
    this.showEvaluation = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.playExplanationAudio();
    }, 1000);
  }

  async saveAnswerToBackend(question: any, answer: string, isCorrect: boolean) {
    try {
      const currentSession = this.apiService.getCurrentSession();
      if (!currentSession || !currentSession.testId) {
        console.warn('⚠️ No hay testId para guardar respuesta');
        return;
      }

      const responseTime = this.questionResponseTime || 30;
      
      const hours = Math.floor(responseTime / 3600);
      const minutes = Math.floor((responseTime % 3600) / 60);
      const seconds = responseTime % 60;
      const timeSpanString = `PT${hours}H${minutes}M${seconds}S`;
      
      const answerData = {
        testId: currentSession.testId,
        preguntaId: parseInt(question.id),
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        timeSpent: timeSpanString,
        numeroOrden: this.currentQuestionNumber,
        isCorrect: isCorrect
      };
      
      console.log('📤 Guardando respuesta oral en BD:', answerData);
      
      await this.apiService.submitAnswer(answerData).toPromise();
      console.log('✅ Respuesta oral guardada correctamente');
      
    } catch (error) {
      console.error('❌ Error guardando respuesta oral:', error);
    }
  }

  compareAnswers(userAnswer: string, correctAnswer: string): boolean {
    const userNorm = userAnswer.toUpperCase().trim();
    const correctNorm = correctAnswer.toUpperCase().trim();
    
    return userNorm === correctNorm;
  }
}