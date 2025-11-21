import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';

export interface AudioRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any;
  private startTime: number = 0;
  private isMobile = Capacitor.isNativePlatform();
  
  private recordingStateSubject = new BehaviorSubject<AudioRecordingState>({
    isRecording: false,
    isProcessing: false,
    recordingDuration: 0,
    audioBlob: null,
    audioUrl: null
  });

  public recordingState$ = this.recordingStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  async initializeRecording(): Promise<boolean> {
    try {
      // MÓVIL: Usar Capacitor Voice Recorder
      if (this.isMobile) {
        const hasPermission = await VoiceRecorder.requestAudioRecordingPermission();
        console.log('✅ Permiso de grabación móvil:', hasPermission.value);
        return hasPermission.value;
      }

      // WEB: Usar MediaRecorder
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no disponible');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '';
            }
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      console.log('✅ Micrófono web inicializado');
      return true;

    } catch (error) {
      console.error('❌ Error al acceder al micrófono:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    this.audioChunks = [];
    this.startTime = Date.now();

    this.updateRecordingState({
      isRecording: true,
      isProcessing: false,
      recordingDuration: 0,
      audioBlob: null,
      audioUrl: null
    });

    // MÓVIL
    if (this.isMobile) {
      await VoiceRecorder.startRecording();
      console.log('🎤 Grabación móvil iniciada');
    } 
    // WEB
    else {
      if (!this.mediaRecorder) {
        console.error('MediaRecorder no inicializado');
        return;
      }
      this.mediaRecorder.start();
      console.log('🎤 Grabación web iniciada');
    }

    // Timer común para ambos
    this.recordingTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateRecordingState({ recordingDuration: duration });
    }, 1000);
  }

  async stopRecording(): Promise<void> {
    clearInterval(this.recordingTimer);

    this.updateRecordingState({
      isRecording: false,
      isProcessing: true
    });

    // MÓVIL
    if (this.isMobile) {
      const result = await VoiceRecorder.stopRecording();
      
      if (result.value && result.value.recordDataBase64) {
        const audioBlob = this.base64ToWavBlob(result.value.recordDataBase64);
        const audioUrl = URL.createObjectURL(audioBlob);

        this.updateRecordingState({
          isProcessing: false,
          audioBlob: audioBlob,
          audioUrl: audioUrl
        });

        console.log('✅ Audio móvil procesado:', audioBlob.size, 'bytes');
      }
    } 
    // WEB
    else {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }
  }

  private base64ToWavBlob(base64: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  private processRecording(): void {
    if (this.audioChunks.length === 0) {
      console.error('No hay datos de audio');
      return;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);

    this.updateRecordingState({
      isProcessing: false,
      audioBlob: audioBlob,
      audioUrl: audioUrl
    });

    console.log('✅ Audio web procesado:', audioBlob.size, 'bytes');
  }

  async uploadAudio(
    audioBlob: Blob, 
    questionId: string, 
    sessionId: string,
    numeroOrden: number,
    tiempoRespuestaSegundos: number 
  ): Promise<any> {
    
    console.log('📤 Enviando audio:', {
      type: audioBlob.type,
      size: audioBlob.size,
      isMobile: this.isMobile
    });

    // En móvil ya viene en WAV, en web convertir si es necesario
    let audioToSend = audioBlob;
    
    if (!this.isMobile && !audioBlob.type.includes('wav')) {
      try {
        console.log('🔄 Convirtiendo a WAV...');
        audioToSend = await this.convertToWav(audioBlob);
        console.log('✅ Convertido:', audioToSend.size, 'bytes');
      } catch (error) {
        console.warn('⚠️ Conversión falló, enviando original:', error);
      }
    }

    const formData = new FormData();
    const fileExtension = audioToSend.type.includes('wav') ? '.wav' : '.webm';
    formData.append('audioFile', audioToSend, `recording_${questionId}${fileExtension}`);
    
    const testIdNumber = parseInt(sessionId, 10);
    const preguntaIdNumber = parseInt(questionId, 10);
    
    if (isNaN(testIdNumber) || isNaN(preguntaIdNumber)) {
      throw new Error('IDs inválidos');
    }
    
    formData.append('testId', testIdNumber.toString());
    formData.append('preguntaGeneradaId', preguntaIdNumber.toString());
    formData.append('numeroOrden', numeroOrden.toString());
    formData.append('tiempoRespuestaSegundos', tiempoRespuestaSegundos.toString());

    try {
      const response = await this.http.post(
        `${environment.apiUrl}/api/Speech/speech-to-text`,
        formData
      ).toPromise();

      console.log('✅ Respuesta del backend:', response);
      return response;

    } catch (error: any) {
      console.error('❌ Error enviando audio:', error);
      throw {
        error: true,
        message: error.error?.message || 'Error al procesar el audio',
        details: error
      };
    }
  }

  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = this.audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = () => reject(new Error('Error leyendo archivo'));
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = 1; // MONO obligatorio
    const sampleRate = 16000; // Azure prefiere 16kHz
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    // Resamplear a 16kHz si es necesario
    const samples = this.resample(audioBuffer.getChannelData(0), audioBuffer.sampleRate, sampleRate);
    const dataLength = samples.length * bytesPerSample;
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
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // Agregar este método
  private resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return samples;
    
    const ratio = fromRate / toRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const index = Math.floor(srcIndex);
      const fraction = srcIndex - index;
      
      if (index + 1 < samples.length) {
        result[i] = samples[index] * (1 - fraction) + samples[index + 1] * fraction;
      } else {
        result[i] = samples[index];
      }
    }
    
    return result;
  }
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  playRecording(audioUrl: string): void {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(error => console.error('Error reproduciendo:', error));
  }

  clearRecording(): void {
    if (this.recordingStateSubject.value.audioUrl) {
      URL.revokeObjectURL(this.recordingStateSubject.value.audioUrl);
    }

    this.updateRecordingState({
      isRecording: false,
      isProcessing: false,
      recordingDuration: 0,
      audioBlob: null,
      audioUrl: null
    });

    this.audioChunks = [];
  }

  stopMediaStreams(): void {
    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  private updateRecordingState(partialState: Partial<AudioRecordingState>): void {
    const currentState = this.recordingStateSubject.value;
    this.recordingStateSubject.next({ ...currentState, ...partialState });
  }

  getCurrentState(): AudioRecordingState {
    return this.recordingStateSubject.value;
  }

  isRecordingSupported(): boolean {
    if (this.isMobile) return true;
    
    try {
      return !!(navigator.mediaDevices && 
                typeof navigator.mediaDevices.getUserMedia === 'function' &&
                typeof window.MediaRecorder !== 'undefined');
    } catch {
      return false;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getSupportedMimeTypes(): string[] {
    if (this.isMobile) return ['audio/wav'];
    
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
    
    if (typeof MediaRecorder?.isTypeSupported !== 'function') return [];
    
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }
}