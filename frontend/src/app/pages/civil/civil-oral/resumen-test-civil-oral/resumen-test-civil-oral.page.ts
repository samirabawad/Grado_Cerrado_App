import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-resumen-test-civil-oral',
  templateUrl: './resumen-test-civil-oral.page.html',
  styleUrls: ['./resumen-test-civil-oral.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class ResumenTestCivilOralPage implements OnInit {

  // Datos del resumen
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  totalQuestions: number = 5;
  percentage: number = 0;
  timeUsed: string = '00:00';
  
  // Estado de cada pregunta para los círculos
  questionsStatus: any[] = [];
  
  // Detalles completos de preguntas
  questionDetails: any[] = [];

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadTestResults();
  }

  loadTestResults() {
    console.log('📊 Cargando resultados del test oral...');
    
    try {
      const resultsString = localStorage.getItem('current_oral_test_results');
      
      if (!resultsString) {
        console.warn('⚠️ No se encontraron resultados guardados');
        this.setDefaultValues();
        return;
      }

      const results = JSON.parse(resultsString);
      console.log('✅ Resultados cargados:', results);
      
      // Cargar estadísticas principales
      this.totalQuestions = results.totalQuestions || 5;
      this.correctAnswers = results.correctAnswers || 0;
      this.incorrectAnswers = results.incorrectAnswers || 0;
      this.percentage = results.percentage || 0;
      
      // Calcular tiempo total usado
      this.calculateTotalTime(results.questionDetails);
      
      // Construir estado de preguntas para los círculos
      if (results.questionDetails && Array.isArray(results.questionDetails)) {
        this.questionDetails = results.questionDetails;
        
        this.questionsStatus = results.questionDetails.map((q: any) => ({
          questionNumber: q.questionNumber,
          isCorrect: q.correct
        }));
      }
      
      console.log('📊 Estadísticas finales:', {
        total: this.totalQuestions,
        correctas: this.correctAnswers,
        incorrectas: this.incorrectAnswers,
        porcentaje: this.percentage,
        tiempo: this.timeUsed
      });
      
    } catch (error) {
      console.error('❌ Error cargando resultados:', error);
      this.setDefaultValues();
    }
  }

  private calculateTotalTime(questionDetails: any[]) {
    if (!questionDetails || !Array.isArray(questionDetails)) {
      this.timeUsed = '00:00';
      return;
    }

    // Sumar todos los tiempos de respuesta
    const totalSeconds = questionDetails.reduce((sum: number, q: any) => {
      return sum + (q.responseTime || 0);
    }, 0);
    
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    this.timeUsed = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    console.log(`⏱️ Tiempo total calculado: ${this.timeUsed} (${totalSeconds}s)`);
  }

  private setDefaultValues() {
    console.warn('⚠️ Usando valores por defecto');
    this.totalQuestions = 5;
    this.correctAnswers = 0;
    this.incorrectAnswers = 5;
    this.percentage = 0;
    this.timeUsed = '00:00';
    this.questionsStatus = [];
    this.questionDetails = [];
  }

  // Ver respuestas incorrectas con detalles
  reviewIncorrect() {
    console.log('👀 Revisando respuestas incorrectas...');
    
    const incorrectDetails = this.questionDetails.filter(q => !q.correct);
    
    if (incorrectDetails.length === 0) {
      this.showNoIncorrectAnswersAlert();
      return;
    }

    // Navegar a una vista de revisión (puedes implementarla después)
    // Por ahora, solo mostrar en consola
    console.log('Respuestas incorrectas:', incorrectDetails);
    
    // TODO: Implementar vista detallada de respuestas incorrectas
    alert('Funcionalidad de revisión en desarrollo. Por ahora revisa la consola (F12).');
  }

  private async showNoIncorrectAnswersAlert() {
    // Podrías usar AlertController aquí
    alert('¡Excelente! No hay respuestas incorrectas para revisar.');
  }

  // Hacer nuevo test oral
  takeNewTest() {
    console.log('🔄 Iniciando nuevo test oral...');
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil/civil-oral']);
  }

  // Volver al inicio
  goBack() {
    console.log('⬅️ Volviendo al inicio...');
    localStorage.removeItem('current_oral_test_results');
    this.router.navigate(['/civil']);
  }

  // Helper para obtener clase CSS del resultado
  getResultClass(): string {
    if (this.percentage >= 80) return 'excellent';
    if (this.percentage >= 60) return 'good';
    if (this.percentage >= 40) return 'regular';
    return 'needs-improvement';
  }

  // Helper para obtener mensaje motivacional
  getMotivationalMessage(): string {
    if (this.percentage >= 80) {
      return '¡Excelente trabajo en el modo oral!';
    } else if (this.percentage >= 60) {
      return '¡Buen desempeño! Sigue practicando.';
    } else if (this.percentage >= 40) {
      return 'Puedes mejorar. ¡Sigue estudiando!';
    } else {
      return 'Necesitas más práctica. ¡No te rindas!';
    }
  }
}