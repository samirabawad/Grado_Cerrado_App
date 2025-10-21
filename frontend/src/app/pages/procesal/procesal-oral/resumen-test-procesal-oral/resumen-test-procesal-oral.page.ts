import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { trigger, transition, style, animate } from '@angular/animations';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  modelAnswer: string;
  explanation: string;
  isCorrect: boolean;
  tema?: string;
}

@Component({
  selector: 'app-resumen-test-procesal-oral',
  templateUrl: './resumen-test-procesal-oral.page.html',
  styleUrls: ['./resumen-test-procesal-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class ResumenTestProcesalOralPage implements OnInit {
  
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';
  motivationalMessage: string = '¡Sigue practicando!';
  
  questionResults: QuestionResult[] = [];
  
  expandedQuestionIndex: number | null = null;

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    const resultsData = localStorage.getItem('current_test_results');
    
    if (!resultsData) {
      console.error('No hay resultados guardados');
      this.router.navigate(['/procesal/procesal-oral']);
      return;
    }

    try {
      const results = JSON.parse(resultsData);
      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.totalQuestions = results.totalQuestions || 0;
      this.percentage = results.percentage || 0;

      if (results.results && Array.isArray(results.results)) {
        this.questionResults = results.results.map((r: any) => ({
          questionNumber: r.questionNumber,
          questionText: r.questionText,
          userAnswer: r.userAnswer || 'Sin respuesta',
          modelAnswer: r.modelAnswer || 'Sin respuesta modelo',
          explanation: r.explanation || 'Sin explicación disponible',
          isCorrect: r.isCorrect,
          tema: r.tema
        }));
      }

      this.setLevel();
      this.setMotivationalMessage();

    } catch (error) {
      console.error('Error al parsear resultados:', error);
      this.router.navigate(['/procesal/procesal-oral']);
    }
  }

  setLevel() {
    if (this.percentage >= 90) {
      this.levelTitle = 'NIVEL EXPERTO';
      this.levelSubtitle = '¡Dominas el tema!';
    } else if (this.percentage >= 70) {
      this.levelTitle = 'NIVEL AVANZADO';
      this.levelSubtitle = '¡Muy buen trabajo!';
    } else if (this.percentage >= 50) {
      this.levelTitle = 'NIVEL INTERMEDIO';
      this.levelSubtitle = 'Vas por buen camino';
    } else {
      this.levelTitle = 'NIVEL PRINCIPIANTE';
      this.levelSubtitle = '¡Sigue practicando!';
    }
  }

  setMotivationalMessage() {
    if (this.percentage >= 90) {
      this.motivationalMessage = '¡Excelente! Dominas el tema';
    } else if (this.percentage >= 80) {
      this.motivationalMessage = '¡Muy bien! Vas por buen camino';
    } else if (this.percentage >= 70) {
      this.motivationalMessage = '¡Buen trabajo! Sigue así';
    } else if (this.percentage >= 60) {
      this.motivationalMessage = 'Vas progresando, continúa';
    } else if (this.percentage >= 40) {
      this.motivationalMessage = 'Sigue practicando, ¡tú puedes!';
    } else {
      this.motivationalMessage = 'No te rindas, ¡inténtalo de nuevo!';
    }
  }

  toggleQuestion(index: number) {
    if (this.expandedQuestionIndex === index) {
      this.expandedQuestionIndex = null;
    } else {
      this.expandedQuestionIndex = index;
    }
  }

  takeNewTest() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/procesal/procesal-oral']);
  }

  goBack() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/procesal/procesal-oral']);
  }

  goToHome() {
    localStorage.removeItem('current_test_results');
    this.router.navigate(['/dashboard']);
  }
}