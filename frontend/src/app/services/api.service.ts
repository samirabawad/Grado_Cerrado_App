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
  private readonly SESSION_STORAGE_KEY = 'grado_cerrado_session';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { 
    // Cargar sesión desde localStorage al inicializar
    this.loadSessionFromStorage();
  }

  // MÉTODOS DE SESIÓN MEJORADOS CON PERSISTENCIA

  // Cargar sesión desde localStorage
  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        console.log('Sesión cargada desde localStorage:', this.currentSession);
      }
    } catch (error) {
      console.error('Error cargando sesión desde localStorage:', error);
      this.currentSession = null;
    }
  }

  // Guardar sesión en localStorage
  private saveSessionToStorage(): void {
    try {
      if (this.currentSession) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
        console.log('Sesión guardada en localStorage');
      }
    } catch (error) {
      console.error('Error guardando sesión en localStorage:', error);
    }
  }

  // Método para obtener la sesión actual (MEJORADO)
  getCurrentSession(): any {
    if (!this.currentSession) {
      console.log('Sesión no encontrada en memoria, intentando cargar desde localStorage...');
      this.loadSessionFromStorage();
    }
    
    console.log('getCurrentSession retorna:', this.currentSession);
    return this.currentSession;
  }

  // Método para establecer la sesión actual (MEJORADO)
  setCurrentSession(session: any): void {
    console.log('setCurrentSession recibida:', session);
    this.currentSession = session;
    this.saveSessionToStorage();
    console.log('Sesión establecida y guardada');
  }

  // Método para limpiar la sesión (MEJORADO)
  clearCurrentSession(): void {
    console.log('Limpiando sesión actual');
    this.currentSession = null;
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
  }

  // Método para actualizar el índice de pregunta actual (MEJORADO)
  updateCurrentQuestionIndex(index: number): void {
    if (this.currentSession) {
      this.currentSession.currentQuestionIndex = index;
      this.saveSessionToStorage(); // Persistir cambios
      console.log('Índice de pregunta actualizado a:', index);
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

  // Método de debug para verificar el estado de la sesión
  debugSession(): void {
    console.log('=== DEBUG SESIÓN ===');
    console.log('Sesión en memoria:', this.currentSession);
    console.log('Sesión en localStorage:', localStorage.getItem(this.SESSION_STORAGE_KEY));
    console.log('==================');
  }

  // Fallback: generar sesión mock si el backend no está disponible
  private generateMockSession(sessionData: any): Observable<any> {
    console.warn('Usando datos mock porque el backend no está disponible');
    
    const mockSession = {
      session: {
        id: 'mock-session-id',
        userId: sessionData.userId,
        startTime: new Date(),
        difficulty: sessionData.difficulty
      },
      questions: this.generateMockQuestions(sessionData.questionCount || 5),
      currentQuestionIndex: 0,
      totalQuestions: sessionData.questionCount || 5
    };
    
    return of(mockSession);
  }

  // Generar preguntas mock para testing
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
  // NUEVO: Método para registrar usuario
registerUser(userData: { name: string, email: string }): Observable<any> {
  const url = `${this.API_URL}/study/register`;
  
  return this.http.post<any>(url, userData, this.httpOptions)
    .pipe(
      map(response => {
        console.log('Usuario registrado exitosamente:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error al registrar usuario:', error);
        throw error;
      })
    );
  }
}