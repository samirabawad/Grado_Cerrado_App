import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// ========================================
// INTERFACES 
// ========================================

export interface SubmitAnswerRequest {
  testId: number;
  preguntaId: number;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  timeSpent: string; 
  numeroOrden: number;
  isCorrect: boolean;
}

export interface SubmitAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  respuestaId: number;
  explanation: string;
  correctAnswer: string;
}

export interface StudyFrequencyConfig {
  frecuenciaSemanal: number;
  objetivoDias: 'flexible' | 'estricto' | 'personalizado';
  diasPreferidos: number[];
  recordatorioActivo: boolean;
  horaRecordatorio: string;
}

export interface StudyFrequencyResponse {
  success: boolean;
  data: {
    estudianteId: number;
    frecuenciaSemanal: number;
    objetivoDias: string;
    diasPreferidos: number[];
    recordatorioActivo: boolean;
    horaRecordatorio: string;
  };
}

export interface CumplimientoResponse {
  success: boolean;
  data: {
    objetivoSemanal: number;
    diasEstudiadosSemana: number;
    porcentajeCumplimiento: number;
    rachaActual: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private API_URL = environment.apiUrl;
  private readonly SESSION_STORAGE_KEY = 'grado_cerrado_session';
  
  // ✅ NUEVO: BehaviorSubject para manejar la sesión actual
  private currentSession$ = new BehaviorSubject<any>(null);
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient,
    
  ) {
    this.loadSessionFromStorage();
    console.log('ApiService inicializado con URL:', this.API_URL);
  }


  // ========================================
  // TEMAS Y SUBTEMAS
  // ========================================


    getTemasByArea(areaId: number) {
    return this.http.get<any>(`${this.API_URL}/study/areas/${areaId}/temas-subtemas`);
  }

  // (Opcional) helpers para no estar recordando el número de área
  getTemasCivil() {
    // area_id = 1 → Derecho Civil
    return this.getTemasByArea(1);
  }

  getTemasProcesal() {
    // area_id = 2 → Derecho Procesal
    return this.getTemasByArea(2);
  }

  // ========================================
  // AUTENTICACIÓN
  // ========================================

  registerUser(userData: { name: string, email: string, password: string }): Observable<any> {
    const url = `${this.API_URL}/Auth/register`;
    
    if (!userData.name || !userData.email || !userData.password) {
      console.error('Datos incompletos para registro:', userData);
      throw new Error('Faltan datos requeridos: name, email y password');
    }
    
    console.log('Enviando registro a:', url, { 
      name: userData.name, 
      email: userData.email, 
      password: '***'
    });
    
    return this.http.post<any>(url, userData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Usuario registrado exitosamente:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error al registrar usuario:', error);
          
          let errorMessage = 'Error al registrar usuario';
          
          if (error.status === 400 && error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 0) {
            errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté funcionando.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          throw { ...error, friendlyMessage: errorMessage };
        })
      );
  }

  loginUser(loginData: { email: string, password: string }): Observable<any> {
    const url = `${this.API_URL}/Auth/login`;  // ✅ CORRECTO: 'Auth' con mayúscula
    
    console.log('Enviando login a:', url, { email: loginData.email });
    
    return this.http.post<any>(url, loginData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Login exitoso:', response);
          
          if (response.success && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
          
          return response;
        }),
        catchError((error: any) => {
          console.error('Error en login:', error);
          
          let errorMessage = 'Error al iniciar sesión';
          
          if (error.status === 400 && error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 0) {
            errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté funcionando.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          throw { ...error, friendlyMessage: errorMessage };
        })
      );
  }

 updateUserProfile(userId: number, updates: any): Observable<any> {
  const url = `${this.API_URL}/auth/update-profile/${userId}`;
  
  console.log('Actualizando perfil:', updates);
  
  return this.http.put<any>(url, updates, this.httpOptions)
    .pipe(
      map((response: any) => {
        console.log('Perfil actualizado:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('Error actualizando perfil:', error);
        
        let errorMessage = 'Error al actualizar el perfil';
        
        if (error.status === 400 && error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'No se puede conectar al servidor';
        }
        
        throw { ...error, friendlyMessage: errorMessage };
      })
    );
}

// ✅ Correcto (sin el segundo "api")
updateUserAvatar(userId: number, payload: { avatarId: number | null; avatarUrl: string | null }) {
  return this.http.put<any>(`${this.API_URL}/study/users/${userId}/avatar`, payload);
}
uploadProfilePhoto(userId: number, formData: FormData) {
  return this.http.post<any>(`${this.API_URL}/study/users/${userId}/avatar/upload`, formData);
}
getUserProfile(userId: number) {
  return this.http.get<any>(`${this.API_URL}/study/users/${userId}/profile`);
}

private getFilesBase(): string {
  return this.API_URL.replace(/\/api\/?$/, '');
}

// Convierte rutas relativas del backend a absolutas con el host del API
public toAbsoluteFileUrl(url?: string): string {
  if (!url) return '';
  // si ya es absoluta o data/blob, la dejo igual
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  // base: quita el sufijo /api de environment.apiUrl
  const base = environment.apiUrl.replace(/\/api\/?$/, '');

  // si viene como "/avatars/xxxxx.png" -> pega el host del API delante
  if (url.startsWith('/')) return `${base}${url}`;

  // para "assets/..." u otras rutas relativas, lo dejo tal cual (sirve para assets locales)
  return url;
}



  logout(): void {
    localStorage.removeItem('currentUser');
    this.clearCurrentSession();
  }

  getCurrentUser(): any {
    try {
      const userString = localStorage.getItem('currentUser');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  // ========================================
  // SESIONES DE ESTUDIO
  // ========================================

  startStudySession(config: {
    studentId: number;
    difficulty: string;
    legalAreas: string[];
    questionCount?: number;
    numberOfQuestions?: number;
    adaptiveMode?: boolean;
    TemaId?: number;
    SubtemaId?: number;
  }): Observable<any> {
    const url = `${this.API_URL}/Study/start-session`;
    
    const currentUser = this.getCurrentUser();
    
    // ✅ Obtener configuración de modo adaptativo del localStorage
    const adaptiveConfig = localStorage.getItem(`adaptive_mode_${currentUser?.id}`);
    let adaptiveEnabled = false;
    
    if (adaptiveConfig) {
      try {
        const parsed = JSON.parse(adaptiveConfig);
        adaptiveEnabled = parsed.enabled || false;
      } catch (error) {
        console.error('Error parseando adaptive config:', error);
      }
    }
    
    // Si se pasa explícitamente en config, usar ese valor
    if (config.adaptiveMode !== undefined) {
      adaptiveEnabled = config.adaptiveMode;
    }
    
    console.log('🎯 Modo adaptativo:', adaptiveEnabled);
    
    const requestBody: any = {
      studentId: config.studentId,
      difficulty: config.difficulty || "basico",
      legalAreas: config.legalAreas || [],
      questionCount: config.numberOfQuestions || config.questionCount || 5,
      adaptiveMode: adaptiveEnabled
    };

  
    if (config.TemaId) {
      requestBody.TemaId = config.TemaId;
      console.log('📚 Filtro de Tema aplicado:', config.TemaId);
    }

    if (config.SubtemaId) {
      requestBody.SubtemaId = config.SubtemaId;
      console.log('📖 Filtro de Subtema aplicado:', config.SubtemaId);
    }
    
    console.log('📚 Iniciando sesión ESCRITA:', requestBody);
    
    return this.http.post<any>(url, requestBody, this.httpOptions)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Sesión iniciada:', response);
            console.log('🎯 Modo adaptativo activo:', response.adaptiveEnabled);
            
            // Guardar la sesión actual
            this.currentSession$.next(response);
            this.saveSessionToStorage(response);
          }
        }),
        catchError(error => {
          console.error('❌ Error iniciando sesión:', error);
          throw error;
        })
      );
  }

  startOralSession(sessionData: any): Observable<any> {
  return this.http.post(`${this.API_URL}/study/start-oral-session`, sessionData);
}

  startReinforcementSession(data: any): Observable<any> {
  return this.http.post(`${this.API_URL}/study/start-reinforcement-session`, data);
}

  /**
   * ✅ Iniciar sesión ORAL
   */
  startOralStudySession(sessionData: any): Observable<any> {
    const url = `${this.API_URL}/Study/start-oral-session`;
    
    const requestData = {
      studentId: sessionData.studentId || 1,
      difficulty: sessionData.difficulty || "intermedio",
      legalAreas: sessionData.legalAreas || ["Derecho Civil"],
      questionCount: sessionData.questionCount || 5
    };
    
    console.log('🎤 Iniciando sesión ORAL:', requestData);
    
    return this.http.post<any>(url, requestData, this.httpOptions)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Sesión ORAL iniciada:', response);
            
            if (response.questions && response.questions.length > 0) {
              console.log('📋 Tipo de preguntas recibidas:', response.questions[0].type);
            }
            
            this.currentSession$.next(response);
            this.saveSessionToStorage(response);
          }
        }),
        catchError(error => {
          console.error('❌ Error iniciando sesión ORAL:', error);
          throw error;
        })
      );
  }

  getCurrentSession(): any {
    return this.currentSession$.value;
  }

  setCurrentSession(session: any): void {
    this.currentSession$.next(session);
    this.saveSessionToStorage(session);
  }

  updateCurrentQuestionIndex(index: number): void {
    const currentSession = this.currentSession$.value;
    if (currentSession) {
      currentSession.currentQuestionIndex = index;
      this.currentSession$.next(currentSession);
      this.saveSessionToStorage(currentSession);
    }
  }

  clearCurrentSession(): void {
    this.currentSession$.next(null);
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
  }

  private saveSessionToStorage(session: any): void {
    try {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error guardando sesión:', error);
    }
  }

  private loadSessionFromStorage(): void {
    try {
      const storedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        this.currentSession$.next(session);
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
      this.clearCurrentSession();
    }
  }

  // ========================================
  // RESPUESTAS
  // ========================================

  submitAnswer(answerData: SubmitAnswerRequest): Observable<SubmitAnswerResponse> {
    const url = `${this.API_URL}/Study/submit-answer`;
    
    console.log('📤 Enviando respuesta al backend:', answerData);
    
    return this.http.post<SubmitAnswerResponse>(url, answerData, this.httpOptions)
      .pipe(
        map((response: SubmitAnswerResponse) => {
          console.log('✅ Respuesta guardada:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error enviando respuesta:', error);
          
          let errorMessage = 'Error al guardar la respuesta';
          
          if (error.status === 0) {
            errorMessage = 'No se puede conectar al servidor';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          throw { ...error, friendlyMessage: errorMessage };
        })
      );
  }

  evaluateOralAnswer(evaluationData: {
    testId: number;
    preguntaGeneradaId: number;
    numeroOrden: number;
    transcription: string;
  }): Observable<any> {
    const url = `${this.API_URL}/Speech/evaluate-oral-answer`;
    
    console.log('📊 Evaluando respuesta oral:', evaluationData);
    
    return this.http.post<any>(url, evaluationData, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Evaluación recibida:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error evaluando respuesta:', error);
          throw error;
        })
      );
  }

    finishTest(testId: number): Observable<any> {
    const url = `${this.API_URL}/Study/finish-test/${testId}`;
    
    return this.http.put<any>(url, {}, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Test finalizado:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error finalizando test:', error);
          throw error;
        })
      );
  }

  // ========================================
  // MODO ADAPTATIVO
  // ========================================

  /**
   * ✅ NUEVO: Obtener temas débiles del estudiante
   */
  getWeakTopics(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Study/weak-topics/${studentId}`;
    
    console.log('📊 Obteniendo temas débiles para estudiante:', studentId);
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Temas débiles obtenidos:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error obteniendo temas débiles:', error);
          
          // Retornar array vacío en caso de error
          return of({
            success: true,
            data: [],
            totalWeakTopics: 0
          });
        })
      );
  }

  /**
   * ✅ NUEVO: Obtener configuración de modo adaptativo desde BD
   */
  getAdaptiveModeConfig(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Study/adaptive-mode/${studentId}`;
    
    console.log('📊 Obteniendo configuración adaptativa para estudiante:', studentId);
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Configuración adaptativa obtenida:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error obteniendo configuración adaptativa:', error);
          
          return of({
            success: true,
            data: {
              studentId: studentId,
              adaptiveModeEnabled: false
            }
          });
        })
      );
  }

  /**
   * ✅ NUEVO: Actualizar configuración de modo adaptativo en BD
   */
  updateAdaptiveModeConfig(studentId: number, enabled: boolean): Observable<any> {
    const url = `${this.API_URL}/Study/adaptive-mode/${studentId}`;
    
    console.log('💾 Actualizando modo adaptativo:', { studentId, enabled });
    
    return this.http.put<any>(url, { enabled }, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Modo adaptativo actualizado en BD:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error actualizando modo adaptativo:', error);
          
          let errorMessage = 'Error al guardar la configuración';
          
          if (error.status === 0) {
            errorMessage = 'No se puede conectar al servidor';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          throw { ...error, friendlyMessage: errorMessage };
        })
      );
  }

  // ========================================
  // DASHBOARD Y ESTADÍSTICAS
  // ========================================

  getDashboardStats(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/stats/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Estadísticas del dashboard:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo estadísticas:', error);
          throw error;
        })
      );
  }

  getRecentSessions(studentId: number, limit: number = 10): Observable<any> {
    const url = `${this.API_URL}/Dashboard/recent-sessions/${studentId}?limit=${limit}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Sesiones recientes:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo sesiones:', error);
          throw error;
        })
      );
  }

  getTestDetail(testId: number): Observable<any> {
  const url = `${this.API_URL}/Dashboard/test-detail/${testId}`;
  
  return this.http.get<any>(url, this.httpOptions)
    .pipe(
      map((response: any) => {
        console.log('✅ Detalle del test obtenido:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo detalle del test:', error);
        throw error;
      })
    );
}


  getAreaStats(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/area-stats/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Estadísticas por área:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo stats por área:', error);
          throw error;
        })
      );
  }

  getAreaStatsWithTemas(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/area-stats-with-temas/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Estadísticas por área con temas:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo stats por área con temas:', error);
          throw error;
        })
      );
  }

  getSubtemaStats(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/subtema-stats/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Estadísticas por subtema:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo stats por subtema:', error);
          throw error;
        })
      );
  }

  getHierarchicalStats(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/hierarchical-stats/${studentId}`;
    return this.http.get<any>(url, this.httpOptions).pipe(
      map((response: any) => {
        console.log('Estadísticas jerárquicas:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('Error obteniendo stats jerárquicas:', error);
        throw error;
      })
    );
  }

  getWeeklyProgress(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Dashboard/weekly-progress/${studentId}`;
    return this.http.get(url, this.httpOptions);
  }

 getMonthlyProgress(studentId: number, semester: number = 1): Observable<any> {
    const url = `${this.API_URL}/Dashboard/monthly-progress/${studentId}/${semester}`;
    return this.http.get<any>(url, this.httpOptions);
  }

  // ========================================
  // DEBILIDADES (WEAKNESS)
  // ========================================

  getTopTemasDebiles(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Weakness/top-debiles/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Top temas débiles:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo temas débiles:', error);
          throw error;
        })
      );
  }

  getResumenDebilidades(studentId: number): Observable<any> {
    const url = `${this.API_URL}/Weakness/resumen/${studentId}`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Resumen debilidades:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo resumen:', error);
          throw error;
        })
      );
  }

  // ========================================
  // FRECUENCIA DE ESTUDIO
  // ========================================

  getStudyFrequency(studentId: number): Observable<StudyFrequencyResponse> {
    const url = `${this.API_URL}/StudyFrequency/${studentId}`;
    
    return this.http.get<StudyFrequencyResponse>(url, this.httpOptions)
      .pipe(
        map((response: StudyFrequencyResponse) => {
          console.log('✅ Frecuencia obtenida:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error obteniendo frecuencia:', error);
          
          return of({
            success: true,
            data: {
              estudianteId: studentId,
              frecuenciaSemanal: 3,
              objetivoDias: 'flexible',
              diasPreferidos: [],
              recordatorioActivo: true,
              horaRecordatorio: '19:00'
            }
          } as StudyFrequencyResponse);
        })
      );
  }

  updateStudyFrequency(studentId: number, config: StudyFrequencyConfig): Observable<any> {
    const url = `${this.API_URL}/StudyFrequency/${studentId}`;
    
    console.log('📤 Actualizando frecuencia:', config);
    
    return this.http.put(url, config, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('✅ Frecuencia actualizada:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error actualizando frecuencia:', error);
          
          let errorMessage = 'Error al guardar la configuración';
          
          if (error.status === 0) {
            errorMessage = 'No se puede conectar al servidor';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          throw { ...error, friendlyMessage: errorMessage };
        })
      );
  }

  getStudyFrequencyCumplimiento(studentId: number): Observable<CumplimientoResponse> {
    const url = `${this.API_URL}/StudyFrequency/${studentId}/cumplimiento`;
    
    return this.http.get<CumplimientoResponse>(url, this.httpOptions)
      .pipe(
        map((response: CumplimientoResponse) => {
          console.log('✅ Cumplimiento obtenido:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('❌ Error obteniendo cumplimiento:', error);
          
          return of({
            success: true,
            data: {
              objetivoSemanal: 3,
              diasEstudiadosSemana: 0,
              porcentajeCumplimiento: 0,
              rachaActual: 0
            }
          } as CumplimientoResponse);
        })
      );
  }

  // ========================================
// NOTIFICACIONES
// ========================================

getNotifications(studentId: number): Observable<any> {
  const url = `${this.API_URL}/Notificaciones/${studentId}`;
  
  console.log('📬 Obteniendo notificaciones para estudiante:', studentId);
  
  return this.http.get<any>(url, this.httpOptions)
    .pipe(
      map((response: any) => {
        console.log('✅ Notificaciones recibidas:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo notificaciones:', error);
        return of({ success: true, data: [], total: 0, noLeidas: 0 });
      })
    );
}

markNotificationAsRead(notificationId: number): Observable<any> {
  const url = `${this.API_URL}/Notificaciones/${notificationId}/leer`;
  
  return this.http.put<any>(url, {}, this.httpOptions)
    .pipe(
      map((response: any) => {
        console.log('✅ Notificación marcada como leída');
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error marcando notificación:', error);
        throw error;
      })
    );
}

getUnreadNotificationsCount(studentId: number): Observable<any> {
  const url = `${this.API_URL}/Notificaciones/${studentId}/contador`;
  
  return this.http.get<any>(url, this.httpOptions)
    .pipe(
      map((response: any) => {
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo contador:', error);
        return of({ success: true, noLeidas: 0 });
      })
    );
}

  // ========================================
  // UTILIDADES Y DEBUG
  // ========================================

  getRegisteredUsers(): Observable<any> {
    const url = `${this.API_URL}/Study/registered-users`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Usuarios registrados:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error obteniendo usuarios:', error);
          throw error;
        })
      );
  }

  checkDatabaseStatus(): Observable<any> {
    const url = `${this.API_URL}/Database/status`;
    
    return this.http.get<any>(url, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Estado de la base de datos:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error verificando base de datos:', error);
          throw error;
        })
      );
  }

  createDatabaseTables(): Observable<any> {
    const url = `${this.API_URL}/Database/create-tables`;
    
    return this.http.post<any>(url, {}, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('Tablas creadas:', response);
          return response;
        }),
        catchError((error: any) => {
          console.error('Error creando tablas:', error);
          throw error;
        })
      );
  }

  checkConnection(): Observable<boolean> {
    const url = `${this.API_URL}/status`;
    
    return this.http.get(url)
      .pipe(
        map(() => {
          console.log('✅ Conexión al backend exitosa');
          return true;
        }),
        catchError((error) => {
          console.error('❌ Error de conexión al backend:', error);
          return of(false);
        })
      );
  }

  testFullSystem(): Observable<any> {
    console.log('🧪 Iniciando test completo del sistema...');
    
    return new Observable(observer => {
      this.checkConnection().subscribe({
        next: (connected) => {
          if (!connected) {
            observer.error('❌ Backend no disponible');
            return;
          }
          
          console.log('✅ Test 1: Conexión OK');
          
          this.checkDatabaseStatus().subscribe({
            next: (dbStatus) => {
              console.log('✅ Test 2: Base de datos OK', dbStatus);
              
              observer.next({
                connection: true,
                database: dbStatus,
                message: 'Sistema completamente operativo'
              });
              observer.complete();
            },
            error: (dbError) => {
              console.log('⚠️ Test 2: Problema con base de datos', dbError);
              observer.next({
                connection: true,
                database: false,
                databaseError: dbError,
                message: 'Backend conectado pero hay problemas con la base de datos'
              });
              observer.complete();
            }
          });
        },
        error: (error) => {
          observer.error('❌ No se puede conectar al backend');
        }
      });
    });
  }
  // ========================================
    //  PREGUNTAS DE REEMPLAZO
    // ========================================
    
    /**
     * Obtener pregunta de reemplazo cuando una no tiene opciones válidas
     */
    getReplacementQuestion(testId: number): Observable<any> {
      const url = `${this.API_URL}/Study/replacement-question/${testId}`;
      
      console.log('🔄 Solicitando pregunta de reemplazo para test:', testId);
      
      return this.http.get<any>(url, this.httpOptions)
        .pipe(
          map((response: any) => {
            console.log('✅ Pregunta de reemplazo recibida:', response);
            return response;
          }),
          catchError((error: any) => {
            console.error('❌ Error obteniendo pregunta de reemplazo:', error);
            
            // Retornar null en caso de error para que se pueda saltar
            return of({
              success: false,
              question: null
            });
          })
        );
    }

    // ========================================
// MÉTODOS PARA TEST ORAL
// ========================================

transcribeAudio(base64Audio: string): Observable<any> {
  const url = `${this.API_URL}/Speech/speech-to-text`;
  
  // Crear FormData
  const formData = new FormData();
  
  // Convertir base64 a Blob
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/webm' });
  
  formData.append('audioFile', blob, 'recording.webm');
  
  console.log('🎤 Enviando audio para transcripción');
  
  return this.http.post<any>(url, formData)
    .pipe(
      map((response: any) => {
        console.log('✅ Transcripción recibida:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error transcribiendo audio:', error);
        throw error;
      })
    );
    
}

// Agregar estos métodos:

requestPasswordReset(email: string): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/forgot-password`, { email });
}

resetPassword(token: string, newPassword: string): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/reset-password`, { token, newPassword });
}

getCurrentUserComplete(studentId: number): Observable<any> {
  return this.http.get(`${this.API_URL}/students/${studentId}/complete`);
}

changePassword(userId: number, passwords: any): Observable<any> {
  return this.http.put(`${this.API_URL}/students/${userId}/change-password`, passwords);
}

deleteAccount(userId: number, password: string): Observable<any> {
  return this.http.delete(`${this.API_URL}/students/${userId}`, { body: { password } });
}

transcribeAudioDirect(formData: FormData): Observable<any> {
  const url = `${this.API_URL}/Speech/speech-to-text`;
  
  console.log('🎤 Enviando audio directo para transcripción');
  
  // No incluir Content-Type para que el navegador lo establezca automáticamente con boundary
  return this.http.post<any>(url, formData)
    .pipe(
      map((response: any) => {
        console.log('✅ Transcripción recibida:', response);
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error transcribiendo audio:', error);
        throw error;
      })
    );
}
}

