import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';

interface QuestionStatus {
  questionNumber: number;
  isCorrect: boolean;
}

@Component({
  selector: 'app-resumen-test-civil-oral',
  templateUrl: './resumen-test-civil-oral.page.html',
  styleUrls: ['./resumen-test-civil-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class ResumenTestCivilOralPage implements OnInit {
  
  // Variables de resultados
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  
  // Variables de nivel y motivación
  levelTitle: string = 'NIVEL PRINCIPIANTE';
  levelSubtitle: string = '¡Sigue practicando!';
  motivationalMessage: string = '¡Sigue practicando!';
  
  // Estado de preguntas para los círculos
  questionsStatus: QuestionStatus[] = [];

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    try {
      const resultsString = localStorage.getItem('current_oral_test_results');
      
      if (!resultsString) {
        console.warn('No hay resultados guardados');
        this.router.navigate(['/civil/civil-oral']);
        return;
      }

      const results = JSON.parse(resultsString);
      
      console.log('📊 Resultados cargados:', results);

      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.totalQuestions = results.totalQuestions || 5;
      this.percentage = results.percentage || 0;

      // Generar estado de preguntas para los círculos
      if (results.questionDetails && results.questionDetails.length > 0) {
        this.questionsStatus = results.questionDetails.map((q: any) => ({
          questionNumber: q.questionNumber,
          isCorrect: q.correct
        }));
      } else {
        // Método alternativo basado en correctas/incorrectas
        this.questionsStatus = [];
        for (let i = 1; i <= this.totalQuestions; i++) {
          this.questionsStatus.push({
            questionNumber: i,
            isCorrect: i <= this.correctAnswers
          });
        }
      }

      this.calculateLevel();
      this.setMotivationalMessage();

    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.router.navigate(['/civil/civil-oral']);
    }
  }

  calculateLevel() {
    if (this.percentage >= 80) {
      this.levelTitle = 'NIVEL AVANZADO';
      this.levelSubtitle = '¡Excelente trabajo!';
    } else if (this.percentage >= 60) {
      this.levelTitle = 'NIVEL INTERMEDIO';
      this.levelSubtitle = '¡Muy bien!';
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

  takeNewTest() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil/civil-oral']);
  }

  goBack() {
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil/civil-oral']);
  }
}