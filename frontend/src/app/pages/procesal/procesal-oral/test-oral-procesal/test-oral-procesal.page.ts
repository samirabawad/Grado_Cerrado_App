import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../../../services/api.service';

interface Question {
  id: number;
  text: string;
  modelAnswer?: string;
  explanation?: string;
  userAnswer?: string;
  isAnswered: boolean;
  tema?: string;
}

@Component({
  selector: 'app-test-oral-procesal',
  templateUrl: './test-oral-procesal.page.html',
  styleUrls: ['./test-oral-procesal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class TestOralProcesalPage implements OnInit, OnDestroy {
  
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  sessionData: any = null;
  testId: number = 0;
  isSubmitting: boolean = false;
  isRecording: boolean = false;
  recordingTime: number = 0;
  recordingInterval: any;
  
  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadSession();
  }

  ngOnDestroy() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  loadSession() {
    this.sessionData = this.apiService.getCurrentSession();
    
    if (!this.sessionData || !this.sessionData.questions) {
      console.error('No hay sesión activa');
      this.router.navigate(['/procesal/procesal-oral']);
      return;
    }

    this.testId = this.sessionData.testId;
    
    this.questions = this.sessionData.questions.map((q: any, index: number) => ({
      id: q.id,
      text: q.text || q.questionText,
      modelAnswer: q.modelAnswer || q.respuestaModelo,
      explanation: q.explanation || q.explicacion,
      userAnswer: '',
      isAnswered: false,
      tema: q.tema || q.topic
    }));

    console.log('✅ Test oral cargado:', this.questions.length, 'preguntas');
  }

  get currentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  get progress(): number {
    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    this.isRecording = true;
    this.recordingTime = 0;
    
    this.recordingInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);
  }

  stopRecording() {
    this.isRecording = false;
    
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }

    if (this.currentQuestion) {
      this.currentQuestion.userAnswer = `Respuesta grabada (${this.recordingTime}s)`;
      this.currentQuestion.isAnswered = true;
    }
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.recordingTime / 60);
    const seconds = this.recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.recordingTime = 0;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.recordingTime = 0;
    }
  }

  async submitTest() {
    const unanswered = this.questions.filter(q => !q.isAnswered).length;
    
    if (unanswered > 0) {
      const alert = await this.alertController.create({
        header: 'Test incompleto',
        message: `Tienes ${unanswered} pregunta(s) sin responder. ¿Deseas enviar el test de todas formas?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Enviar', handler: () => this.processSubmit() }
        ]
      });
      await alert.present();
    } else {
      await this.processSubmit();
    }
  }

  async processSubmit() {
    const loading = await this.loadingController.create({
      message: 'Guardando respuestas...',
      spinner: 'crescent'
    });
    
    await loading.present();
    this.isSubmitting = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        await loading.dismiss();
        alert('Error: Usuario no autenticado');
        return;
      }

      const mockResults = {
        success: true,
        testId: this.testId,
        correctAnswers: this.questions.filter(q => q.isAnswered).length,
        incorrectAnswers: this.questions.filter(q => !q.isAnswered).length,
        totalQuestions: this.questions.length,
        percentage: Math.round((this.questions.filter(q => q.isAnswered).length / this.questions.length) * 100),
        results: this.questions.map((q, index) => ({
          questionNumber: index + 1,
          questionText: q.text,
          userAnswer: q.userAnswer || 'Sin respuesta',
          modelAnswer: q.modelAnswer || '',
          explanation: q.explanation || '',
          isCorrect: q.isAnswered,
          tema: q.tema
        }))
      };

      localStorage.setItem('current_test_results', JSON.stringify(mockResults));
      
      await loading.dismiss();
      await this.router.navigate(['/procesal/procesal-oral/resumen-test-procesal-oral']);

    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error al enviar test:', error);
      alert('Hubo un error al enviar el test');
    } finally {
      this.isSubmitting = false;
    }
  }

  async exitTest() {
    const alert = await this.alertController.create({
      header: 'Salir del test',
      message: '¿Estás seguro de que deseas salir? Perderás tu progreso.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Salir', 
          role: 'destructive',
          handler: () => {
            this.apiService.clearCurrentSession();
            this.router.navigate(['/procesal/procesal-oral']);
          }
        }
      ]
    });
    await alert.present();
  }
}