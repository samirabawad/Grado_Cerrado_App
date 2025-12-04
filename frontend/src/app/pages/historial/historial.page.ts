import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

interface SessionGroup {
  date: string;
  sessions: any[];
  expanded: boolean;
}

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class HistorialPage implements OnInit {

  isLoading: boolean = true;
  recentSessions: any[] = [];
  groupedSessions: SessionGroup[] = [];
  expandedSession: number | null = null;
  expandedQuestion: number | null = null;
  sessionDetails: any = null;
  isLoadingDetails: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  async ngOnInit() {
    await this.loadHistory();
  }

  ionViewWillEnter() {
    this.loadHistory();
  }

  async loadHistory() {
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
            date: this.convertUTCToChileTime(session.date),
            area: session.area || 'Derecho Civil',
            questionsAnswered: session.totalQuestions || 0,
            correctAnswers: session.correctAnswers || 0,
            successRate: session.successRate || 0,
            difficulty: session.difficulty || 'intermedio',
          }));

          this.groupSessionsByDate();

          console.log('Sesiones recientes cargadas:', this.recentSessions.length);
        }

      } catch (error) {
        console.error('Error cargando sesiones recientes:', error);
      }

    } catch (error) {
      console.error('Error en loadHistory:', error);
    } finally {
      this.isLoading = false;
    }
  }

  convertUTCToChileTime(utcDate: string): Date {
    const date = new Date(utcDate);
    return date;
  }

  groupSessionsByDate() {
    const groups: { [key: string]: any[] } = {};

    this.recentSessions.forEach(session => {
      const dateKey = this.formatDateKey(session.date);
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(session);
    });

    this.groupedSessions = Object.keys(groups)
      .sort((a, b) => {
        const dateA = this.parseDateKey(a);
        const dateB = this.parseDateKey(b);
        return dateB.getTime() - dateA.getTime();
      })
      .map(dateKey => ({
        date: dateKey,
        sessions: groups[dateKey].sort((a, b) => b.date.getTime() - a.date.getTime()),
        expanded: true
      }));

    console.log('Sesiones agrupadas:', this.groupedSessions);
  }

  formatDateKey(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Hoy';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${date.getDate()} de ${months[date.getMonth()]}`;
    }
  }

  parseDateKey(dateKey: string): Date {
    if (dateKey === 'Hoy') {
      return new Date();
    } else if (dateKey === 'Ayer') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    } else {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const parts = dateKey.split(' de ');
      const day = parseInt(parts[0]);
      const monthIndex = months.indexOf(parts[1]);
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, monthIndex, day);
    }
  }

  toggleGroup(group: SessionGroup) {
    group.expanded = !group.expanded;
  }

  viewSessionDetail(session: any) {
    if (this.expandedSession === session.testId) {
      this.expandedSession = null;
      this.sessionDetails = null;
      this.expandedQuestion = null;
    } else {
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
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
      return ['Verdadero', 'Falso'];
    }

    if (Array.isArray(question.answers) && question.answers.length > 0) {
      return question.answers.map((answer: any) => answer.text);
    }

    return [];
  }

isOptionSelected(question: any, option: string): boolean {
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
      if (question.selectedAnswer === 'A' && option === 'Verdadero') return true;
      if (question.selectedAnswer === 'B' && option === 'Falso') return true;
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
    if (question.questionType === 'verdadero_falso' || question.questionType === 2 || question.questionType === '2') {
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
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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