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
  selector: 'app-test-oral-procesal',
  templateUrl: './test-oral-procesal.page.html',
  styleUrls: ['./test-oral-procesal.page.scss'],
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
export class TestOralProcesalPage implements OnInit, OnDestroy {

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
    
    await this.audioService.initializeRecording();
    
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
          console.log('🔎 Primera pregunta:', this.questions[0]);
          
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
    this.router.navigate(['/procesal/procesal-oral']);
  }

  convertBackendQuestions(backendQuestions: any[]): Question[] {
    return backendQuestions.map((q: any) => ({
      id: q.id?.toString() || Math.random().toString(),
      text: q.texto_pregunta || q.questionText || q.text || '',
      questionText: q.texto_pregunta || q.questionText || q.text || '',
      type: q.tipo || q.type || 1,
      category: q.tema || q.category || 'Derecho Procesal',
      tema: q.tema || q.category || 'Derecho Procesal',
      legalArea: q.legalArea || 'Derecho Procesal',
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
      utterance.lang = 'es-CL';
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;

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

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('🔊 Voces disponibles:', voices.map(v => `${v.name} (${v.lang})`));
        
        let selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('catalina')
        );
        
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang.includes('es') && (
              voice.name.toLowerCase().includes('female') ||
              voice.name.toLowerCase().includes('femenina') ||
              voice.name.toLowerCase().includes('mónica') ||
              voice.name.toLowerCase().includes('monica') ||
              voice.name.toLowerCase().includes('paulina')
            )
          );
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('✅ Voz seleccionada:', selectedVoice.name);
        } else {
          console.log('⚠️ Usando voz por defecto del sistema');
        }
        
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
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
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.audioService.clearRecording();
      
      await this.audioService.startRecording();
      
      console.log('🎤 Grabación iniciada');
      this.startResponseTimer();
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
    }
  }

  async stopRecording() {
    try {
      await this.audioService.stopRecording();
      this.stopResponseTimer();
      console.log('⏹️ Grabación detenida');
    } catch (error) {
      console.error('❌ Error al detener grabación:', error);
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
    if (!this.audioBlob) {
      console.warn('⚠️ No hay audio para reproducir');
      return;
    }

    if (this.isPlayingRecording && this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio.currentTime = 0;
      this.isPlayingRecording = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
    }

    try {
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

  playExplanationAudio() {
      if (!this.evaluationResult?.explanation) return;

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(this.evaluationResult.explanation);
        utterance.lang = 'es-CL';
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          this.isPlayingExplanation = true;
          this.cdr.detectChanges();
        };

        utterance.onend = () => {
          this.isPlayingExplanation = false;
          this.cdr.detectChanges();
        };

        utterance.onerror = () => {
          this.isPlayingExplanation = false;
          this.cdr.detectChanges();
        };

        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          
          let selectedVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('catalina')
          );
          
          if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
              voice.lang.includes('es') && (
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('femenina') ||
                voice.name.toLowerCase().includes('paulina')
              )
            );
          }
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
          loadVoices();
        } else {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
      }
  }

  pauseExplanationAudio() {
    if ('speechSynthesis' in window && this.isPlayingExplanation) {
      window.speechSynthesis.cancel();
      this.isPlayingExplanation = false;
      this.cdr.detectChanges();
    }
  }

  async submitVoiceAnswer() {
    if (!this.audioBlob) {
      const alert = await this.alertController.create({
        header: 'Sin audio',
        message: 'Primero debes grabar tu respuesta.',
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
      console.log('🎤 Preparando audio para transcripción...');
      console.log('📊 Tamaño del blob:', this.audioBlob.size, 'bytes');
      console.log('🎵 Tipo de blob:', this.audioBlob.type);

      const wavBlob = await this.convertToWav(this.audioBlob);
      console.log('✅ Audio convertido a WAV:', wavBlob.size, 'bytes');

      const formData = new FormData();
      formData.append('audioFile', wavBlob, 'recording.wav');

      console.log('📤 Enviando audio WAV al backend');

      try {
        const transcriptionResponse = await this.apiService.transcribeAudioDirect(formData).toPromise();
        
        console.log('📥 Transcripción recibida:', transcriptionResponse);

        if (transcriptionResponse && transcriptionResponse.transcription) {
          this.currentTranscription = transcriptionResponse.transcription;
          console.log('✅ Texto transcrito:', this.currentTranscription);

          const detectedOption = this.detectOptionFromTranscription(this.currentTranscription);
          
          if (detectedOption) {
            console.log('✅ Opción detectada:', detectedOption);
            await this.selectAnswer(detectedOption);
            await loading.dismiss();
          } else {
            await loading.dismiss();
            const alert = await this.alertController.create({
              header: 'No entendí tu respuesta',
              message: `Dijiste: "${this.currentTranscription}". Di una opción clara como: A, B, C, Verdadero o Falso.`,
              buttons: ['OK']
            });
            await alert.present();
          }
        } else {
          await loading.dismiss();
          const alert = await this.alertController.create({
            header: 'Error',
            message: 'No se pudo transcribir el audio. Intenta de nuevo.',
            buttons: ['OK']
          });
          await alert.present();
        }
      } catch (error: any) {
        console.error('❌ Error transcribiendo:', error);
        await loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'Hubo un error al procesar tu respuesta.',
          buttons: ['OK']
        });
        await alert.present();
      }
      
    } catch (error) {
      console.error('❌ Error preparando audio:', error);
      await loading.dismiss();
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudo preparar el audio.',
        buttons: ['OK']
      });
      await alert.present();
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
      .replace(/[.,;:!?¿¡]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const question = this.getCurrentQuestion();
    
    if (!question) return null;

    console.log('🔍 Texto limpio para detectar:', text);

    if (question.type == 2 || question.type == '2') {
      if (text.includes('verdadero') || text.includes('true') || text.includes('sí') || text.includes('si')) {
        console.log('✅ Detectado: Verdadero');
        return 'Verdadero';
      }
      if (text.includes('falso') || text.includes('false')) {
        console.log('✅ Detectado: Falso');
        return 'Falso';
      }
      
      const words = text.split(' ').filter(w => w.length > 0);
      for (const word of words) {
        if (word === 'v' || word === 've') {
          console.log('✅ Detectado: Verdadero (por letra V)');
          return 'Verdadero';
        }
        if (word === 'f' || word === 'efe') {
          console.log('✅ Detectado: Falso (por letra F)');
          return 'Falso';
        }
      }
    }

    const options = this.getCurrentQuestionOptions();
    const words = text.split(' ').filter(w => w.length > 0);
    
    for (let i = 0; i < Math.min(5, words.length); i++) {
      const word = words[i];
      
      if (word === 'a') {
        console.log('✅ Detectado: Opción A');
        return options[0];
      }
      if (word === 'b' || word === 'be') {
        console.log('✅ Detectado: Opción B');
        return options[1];
      }
      if (word === 'c' || word === 'ce') {
        console.log('✅ Detectado: Opción C');
        return options[2];
      }
      if (word === 'd' || word === 'de') {
        console.log('✅ Detectado: Opción D');
        return options[3];
      }
    }

    if (text.includes('letra a') || text.includes('opcion a') || text.includes('alternativa a')) {
      console.log('✅ Detectado: Opción A');
      return options[0];
    }
    if (text.includes('letra b') || text.includes('opcion b') || text.includes('alternativa b')) {
      console.log('✅ Detectado: Opción B');
      return options[1];
    }
    if (text.includes('letra c') || text.includes('opcion c') || text.includes('alternativa c')) {
      console.log('✅ Detectado: Opción C');
      return options[2];
    }
    if (text.includes('letra d') || text.includes('opcion d') || text.includes('alternativa d')) {
      console.log('✅ Detectado: Opción D');
      return options[3];
    }

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const optionWords = option.toLowerCase()
        .replace(/[.,;:!?¿¡]/g, ' ')
        .split(' ')
        .filter((w: string) => w.length > 4);
      
      const matches = optionWords.filter((word: string) => text.includes(word));
      
      if (matches.length >= 3) {
        console.log(`✅ Detectado por contenido: Opción ${String.fromCharCode(65 + i)}`);
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
    this.isRecording = false;
    this.hasRecording = false;
    this.showEvaluation = false;
    this.evaluationResult = null;
    this.showCorrectAnswer = false;
    this.currentTranscription = '';
    this.isPlayingExplanation = false;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    if (this.recordingAudio) {
      this.recordingAudio.pause();
      this.recordingAudio = null;
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
      
      await this.router.navigate(['/procesal/procesal-oral/resumen-test-procesal-oral']);
      
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
          this.router.navigate(['/procesal/procesal-oral']);
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
          this.router.navigate(['/procesal/procesal-oral']);
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

    if (question.type == 2 || question.type == '2') {
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

    return [];
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isOptionSelected(option: string): boolean {
    const question = this.getCurrentQuestion();
    if (!question || !question.userAnswer) return false;

    if (question.type == 2 || question.type == '2') {
      if (question.userAnswer === 'V' && option === 'Verdadero') return true;
      if (question.userAnswer === 'F' && option === 'Falso') return true;
      return false;
    }

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

    if (question.type == 2 || question.type == '2') {
      const correctAnswerNorm = question.correctAnswer.toLowerCase().trim();
      const isVerdaderoCorrect = correctAnswerNorm === 'true' || 
                                  correctAnswerNorm === 'v' || 
                                  correctAnswerNorm === 'verdadero';
      
      if (option === 'Verdadero' && isVerdaderoCorrect) return true;
      if (option === 'Falso' && !isVerdaderoCorrect) return true;
      return false;
    }

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
    
    this.showCorrectAnswer = true;
    this.showEvaluation = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.playExplanationAudio();
    }, 1000);
  }

  compareAnswers(userAnswer: string, correctAnswer: string): boolean {
    const userNorm = userAnswer.toUpperCase().trim();
    const correctNorm = correctAnswer.toUpperCase().trim();
    
    return userNorm === correctNorm;
  }
}