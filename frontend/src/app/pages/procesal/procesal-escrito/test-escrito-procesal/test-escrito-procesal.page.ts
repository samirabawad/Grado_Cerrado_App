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
  type: string;
  options?: any[];
  userAnswer?: any;
  isAnswered: boolean;
  tema?: string;
}

@Component({
  selector: 'app-test-escrito-procesal',
  templateUrl: './test-escrito-procesal.page.html',
  styleUrls: ['./test-escrito-procesal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class TestEscritoProcesalPage implements OnInit, OnDestroy {
  
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  sessionData: any = null;
  testId: number = 0;
  isSubmitting: boolean = false;
  
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
  }

  loadSession() {
    this.sessionData = this.apiService.getCurrentSession();
    
    if (!this.sessionData || !this.sessionData.questions) {
      console.error('No hay sesión activa');
      this.router.navigate(['/procesal/procesal-escrito']);
      return;
    }

    this.testId = this.sessionData.testId;
    
    this.questions = this.sessionData.questions.map((q: any, index: number) => ({
      id: q.id,
      text: q.text || q.questionText,
      type: q.type || q.questionType,
      options: q.options || [],
      userAnswer: null,
      isAnswered: false,
      tema: q.tema || q.topic
    }));

    console.log('✅ Test cargado:', this.questions.length, 'preguntas');
  }

  get currentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  get progress(): number {
    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  selectOption(option: string) {
    if (this.currentQuestion) {
      this.currentQuestion.userAnswer = option;
      this.currentQuestion.isAnswered = true;
    }
  }

  selectBoolean(value: boolean) {
    if (this.currentQuestion) {
      this.currentQuestion.userAnswer = value;
      this.currentQuestion.isAnswered = true;
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
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
      message: 'Evaluando respuestas...',
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

      const results: any[] = [];
      
      for (let i = 0; i < this.questions.length; i++) {
        const q = this.questions[i];
        
        const answerData = {
          preguntaId: q.id,
          userAnswer: q.userAnswer !== undefined ? q.userAnswer : null,
          correctAnswer: '',
          explanation: '',
          isCorrect: false,
          timeSpent: '0',
          studentId: currentUser.id,
          testId: this.testId,
          numeroOrden: i + 1
        };

        try {
          const response = await this.apiService.submitAnswer(answerData).toPromise();
          results.push(response);
        } catch (error) {
          console.error('Error enviando pregunta', q.id, error);
        }
      }

      const correctAnswers = results.filter(r => r.isCorrect).length;
      const incorrectAnswers = results.length - correctAnswers;
      const percentage = Math.round((correctAnswers / results.length) * 100);

      const mockResults = {
        success: true,
        testId: this.testId,
        correctAnswers: correctAnswers,
        incorrectAnswers: incorrectAnswers,
        totalQuestions: this.questions.length,
        percentage: percentage,
        results: this.questions.map((q, index) => ({
          questionNumber: index + 1,
          questionText: q.text,
          userAnswer: q.userAnswer !== undefined ? q.userAnswer : 'Sin respuesta',
          correctAnswer: results[index]?.correctAnswer || '',
          explanation: results[index]?.explanation || 'Sin explicación',
          isCorrect: results[index]?.isCorrect || false,
          options: q.options,
          type: q.type
        }))
      };

      localStorage.setItem('current_test_results', JSON.stringify(mockResults));
      
      await loading.dismiss();
      await this.router.navigate(['/procesal/procesal-escrito/resumen-test-procesal']);

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
            this.router.navigate(['/procesal/procesal-escrito']);
          }
        }
      ]
    });
    await alert.present();
  }
}