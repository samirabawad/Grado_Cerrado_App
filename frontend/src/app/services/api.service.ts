import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  private readonly API_URL = 'http://localhost:5183/api';
  private currentSession: any = null;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  // Método para obtener la sesión actual
  getCurrentSession(): any {
    return this.currentSession;
  }

  // Método para establecer la sesión actual
  setCurrentSession(session: any): void {
    this.currentSession = session;
  }

  // Método para limpiar la sesión
  clearCurrentSession(): void {
    this.currentSession = null;
  }

  // Método para actualizar el índice de pregunta actual
  updateCurrentQuestionIndex(index: number): void {
    if (this.currentSession) {
      this.currentSession.currentQuestionIndex = index;
    }
  }

  // Método para iniciar sesión de estudio
  startStudySession(sessionData: any): Observable<any> {
    const url = `${this.API_URL}/study/start-session`;
    
    return this.http.post<any>(url, sessionData, this.httpOptions)
      .pipe(
        map(response => {
          console.log('Respuesta del backend:', response);
          return response;
        }),
        catchError(error => {
          console.error('Error al iniciar sesión:', error);
          // Fallback a datos mock si el backend falla
          return this.generateMockSession(sessionData);
        })
      );
  }

  // Método para enviar respuesta
  answerQuestion(answerData: any): Observable<any> {
    const url = `${this.API_URL}/study/answer-question`;
    
    return this.http.post<any>(url, answerData, this.httpOptions)
      .pipe(
        map(response => {
          console.log('Respuesta enviada al backend:', response);
          return response;
        }),
        catchError(error => {
          console.error('Error al enviar respuesta:', error);
          // Fallback a respuesta mock
          return of({
            success: true,
            correct: answerData.userAnswer === answerData.correctAnswer,
            explanation: answerData.explanation
          });
        })
      );
  }

  // Método para obtener preguntas
  getQuestions(params: any): Observable<any> {
    const url = `${this.API_URL}/study/questions`;
    
    return this.http.get<any>(url, { ...this.httpOptions, params })
      .pipe(
        catchError(error => {
          console.error('Error al obtener preguntas:', error);
          return of([]);
        })
      );
  }

  // Método para verificar conexión con el backend
  checkConnection(): Observable<boolean> {
    const url = `${this.API_URL}/health`;
    
    return this.http.get(url)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  // Fallback: generar sesión mock si el backend no está disponible
  private generateMockSession(sessionData: any): Observable<any> {
    console.warn('Usando datos mock - backend no disponible');
    
    const mockSession = {
      session: {
        id: 'mock-session-' + Date.now(),
        userId: sessionData.userId,
        legalAreas: sessionData.legalAreas,
        difficulty: sessionData.difficulty,
        questionCount: sessionData.questionCount
      },
      questions: this.generateMockQuestions(sessionData.questionCount),
      currentQuestionIndex: 0,
      totalQuestions: sessionData.questionCount
    };

    return of(mockSession);
  }

  // Generar preguntas mock para pruebas
  private generateMockQuestions(count: number): any[] {
    const questions = [];
    const areas = ['Contratos', 'Obligaciones', 'Derechos Reales', 'Familia', 'Sucesiones'];
    
    for (let i = 0; i < count; i++) {
      const area = areas[i % areas.length];
      questions.push({
        id: `mock-question-${i + 1}`,
        questionText: `Pregunta ${i + 1} sobre ${area}: ¿Cuál de las siguientes afirmaciones es correcta respecto a los ${area.toLowerCase()}?`,
        type: 0, // MultipleChoice
        legalArea: area,
        difficulty: Math.floor(Math.random() * 3), // 0, 1, 2
        correctAnswer: 'A',
        explanation: `La respuesta correcta es A porque en ${area} se establece que...`,
        options: [
          { id: 'A', text: `Opción correcta sobre ${area}` },
          { id: 'B', text: `Opción incorrecta 1 sobre ${area}` },
          { id: 'C', text: `Opción incorrecta 2 sobre ${area}` },
          { id: 'D', text: `Opción incorrecta 3 sobre ${area}` }
        ]
      });
    }
    return questions;
  }
}