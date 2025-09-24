import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private API_URL = environment.apiUrl;
  private readonly SESSION_STORAGE_KEY = 'grado_cerrado_session';
  private currentSession: any = null;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {
    this.loadSessionFromStorage();
    console.log('ApiService inicializado con URL:', this.API_URL);
  }

  // REGISTRO DE USUARIO - CONECTA CON BACKEND
  registerUser(userData: { name: string, email: string }): Observable<any> {
    const url = `${this.API_URL}/Study/register`;
    
    console.log('Enviando registro a:', url, userData);
    
    return this.http.post<any>(url, userData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Usuario registrado exitosamente:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error al registrar usuario:', error);
          throw error;
        })
      );
  }

  // OBTENER USUARIOS REGISTRADOS
  getRegisteredUsers(): Observable<any> {
    const url = `${this.API_URL}/Study/registered-users`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Usuarios obtenidos:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error obteniendo usuarios:', error);
          throw error;
        })
      );
  }

  // TEST DE CONEXIÓN
  testConnection(): Observable<any> {
    const url = `${this.API_URL}/Database/status`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Conexión exitosa al backend:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error de conexión:', error);
          throw error;
        })
      );
  }

  // MÉTODOS DE SESIÓN (existentes)
  startStudySession(sessionData: any): Observable<any> {
    const url = `${this.API_URL}/Study/start-session`;
    
    return this.http.post<any>(url, sessionData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Sesión iniciada:', response);
          this.setCurrentSession(response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error al iniciar sesión:', error);
          return this.generateMockSession(sessionData);
        })
      );
  }

  getCurrentSession(): any {
    return this.currentSession;
  }

  setCurrentSession(session: any): void {
    this.currentSession = session;
    this.saveSessionToStorage(session);
  }

  updateCurrentQuestionIndex(index: number): void {
    if (this.currentSession) {
      this.currentSession.currentQuestionIndex = index;
      this.saveSessionToStorage(this.currentSession);
    }
  }

  clearCurrentSession(): void {
    this.currentSession = null;
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
  }

  checkConnection(): Observable<boolean> {
    const url = `${this.API_URL}/Database/status`;
    
    return this.http.get(url)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  answerQuestion(answerData: any): Observable<any> {
    const url = `${this.API_URL}/Study/answer-question`;
    
    return this.http.post<any>(url, answerData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Respuesta enviada:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error al enviar respuesta:', error);
          return of({
            success: true,
            correct: answerData.userAnswer === answerData.correctAnswer,
            explanation: answerData.explanation || 'Respuesta procesada (modo offline)'
          });
        })
      );
  }

  private saveSessionToStorage(session: any): void {
    this.currentSession = session;
    localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private loadSessionFromStorage(): void {
    const savedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
    if (savedSession) {
      this.currentSession = JSON.parse(savedSession);
    }
  }

  private generateMockSession(sessionData: any): Observable<any> {
    console.warn('Usando datos mock porque el backend no está disponible');
    
    const mockSession = {
      session: {
        id: 'mock-session-id',
        userId: sessionData.userId || 'mock-user',
        startTime: new Date(),
        difficulty: sessionData.difficulty || 1
      },
      questions: this.generateMockQuestions(sessionData.questionCount || 5),
      currentQuestionIndex: 0,
      totalQuestions: sessionData.questionCount || 5
    };
    
    return of(mockSession);
  }

  private generateMockQuestions(count: number): any[] {
    const mockQuestions = [];
    
    for (let i = 0; i < count; i++) {
      mockQuestions.push({
        id: `mock-question-${i + 1}`,
        questionText: `¿Cuál de las siguientes afirmaciones sobre Derecho Civil es correcta? (Pregunta ${i + 1})`,
        type: 1,
        category: 'Derecho Civil',
        legalArea: 'Civil',
        difficulty: 1,
        correctAnswer: 'A',
        explanation: 'Esta es una explicación mock para propósitos de testing.',
        options: [
          'Opción A - Correcta (mock)',
          'Opción B - Incorrecta (mock)', 
          'Opción C - Incorrecta (mock)',
          'Opción D - Incorrecta (mock)'
        ]
      });
    }
    
    return mockQuestions;
  }

  debugSession(): void {
    console.log('=== DEBUG SESIÓN ===');
    console.log('Backend URL:', this.API_URL);
    console.log('Sesión en memoria:', this.currentSession);
    console.log('Sesión en localStorage:', localStorage.getItem(this.SESSION_STORAGE_KEY));
    console.log('==================');
  }
}