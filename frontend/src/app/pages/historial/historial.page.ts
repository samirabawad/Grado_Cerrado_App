import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent],
})
export class HistorialPage implements OnInit {
  recentSessions: any[] = [];
  groupedSessions: { date: string; sessions: any[]; expanded: boolean }[] = [];
  expandedSession: number | null = null;
  expandedQuestion: number | null = null;
  sessionDetails: any = null;
  isLoading: boolean = true;
  isLoadingDetails: boolean = false;

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit() {
    this.loadRecentSessions();
  }

  async loadRecentSessions() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando historial para estudiante:', studentId);

      try {
        const response = await this.apiService.getRecentSessions(studentId, 250).toPromise();

        if (response && response.success && response.data) {
          this.recentSessions = response.data.map((session: any) => ({
            testId: session.testId,
            date: new Date(session.date),
            area: session.area || 'Derecho Civil',
            questionsAnswered: session.totalQuestions || 0,
            correctAnswers: session.correctAnswers || 0,
            successRate: session.successRate || 0,
            difficulty: session.difficulty || 'intermedio',
          }));

          // Agrupar sesiones por día
          this.groupSessionsByDate();

          console.log('Sesiones recientes cargadas:', this.recentSessions.length);
        }
      } catch (error) {
        console.error('Error cargando sesiones:', error);
      }
    } catch (error) {
      console.error('Error general en loadRecentSessions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  groupSessionsByDate() {
    const grouped = new Map<string, any[]>();

    this.recentSessions.forEach((session) => {
      const dateKey = this.getDateKey(session.date);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(session);
    });

    // Ordenar por fecha (más reciente primero)
    this.groupedSessions = Array.from(grouped.entries())
      .sort((a, b) => {
        const dateA = a[1][0].date;
        const dateB = b[1][0].date;
        return dateB.getTime() - dateA.getTime();
      })
      .map(([date, sessions]) => ({
        date,
        sessions,
        expanded: false,
      }));
  }

  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  getDateKey(date: Date): string {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const today = new Date();
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    if (isCurrentYear) {
      return months[date.getMonth()];
    } else {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  viewSessionDetail(session: any) {
    if (this.expandedSession === session.testId) {
      // Si ya está abierta, cerrarla
      this.expandedSession = null;
      this.sessionDetails = null;
      this.expandedQuestion = null;
    } else {
      // Abrir y cargar detalles
      this.expandedSession = session.testId;
      this.loadSessionDetails(session.testId);
    }
  }

  async loadSessionDetails(testId: number) {
    this.isLoadingDetails = true;
    this.expandedQuestion = null;

    try {
      const response = await this.apiService.getTestDetail(testId).toPromise();

      if (response && response.success) {
        this.sessionDetails = response.data;
        console.log('Detalles del test cargados:', this.sessionDetails);
      }
    } catch (error) {
      console.error('Error cargando detalles del test:', error);
    } finally {
      this.isLoadingDetails = false;
    }
  }

  toggleQuestion(index: number) {
    if (this.expandedQuestion === index) {
      this.expandedQuestion = null;
    } else {
      this.expandedQuestion = index;
    }
  }

  getQuestionOptions(question: any): string[] {
    if (
      question.questionType === 'verdadero_falso' ||
      question.questionType === 2 ||
      question.questionType === '2'
    ) {
      return ['Verdadero', 'Falso'];
    }

    if (Array.isArray(question.answers) && question.answers.length > 0) {
      return question.answers.map((answer: any) => answer.text);
    }

    return [];
  }

  isOptionSelected(question: any, option: string): boolean {
    if (
      question.questionType === 'verdadero_falso' ||
      question.questionType === 2 ||
      question.questionType === '2'
    ) {
      if (question.selectedAnswer === 'V' && option === 'Verdadero') return true;
      if (question.selectedAnswer === 'F' && option === 'Falso') return true;
      return false;
    }

    if (Array.isArray(question.answers)) {
      const answer = question.answers.find((a: any) => a.text === option);
      if (answer) {
        return answer.letter === question.selectedAnswer;
      }
    }

    return false;
  }

  isOptionCorrect(question: any, option: string): boolean {
    if (
      question.questionType === 'verdadero_falso' ||
      question.questionType === 2 ||
      question.questionType === '2'
    ) {
      if (Array.isArray(question.answers)) {
        const correctAnswer = question.answers.find((a: any) => a.isCorrect);
        if (correctAnswer) {
          if (correctAnswer.letter === 'A' && option === 'Verdadero') return true;
          if (correctAnswer.letter === 'B' && option === 'Falso') return true;
        }
      }
      return false;
    }

    if (Array.isArray(question.answers)) {
      const answer = question.answers.find((a: any) => a.text === option);
      if (answer) {
        return answer.isCorrect === true;
      }
    }

    return false;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  formatDate(date: Date): string {
    return date
      .toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', ' ·');
  }

  getSuccessRateColor(rate: number): string {
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}
