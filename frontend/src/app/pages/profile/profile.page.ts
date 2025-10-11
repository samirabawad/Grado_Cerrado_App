// frontend/src/app/pages/profile/profile.page.ts

import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService, StudyFrequencyConfig } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, BottomNavComponent]
})
export class ProfilePage implements OnInit, AfterViewInit {

  @ViewChild('timeInput') timeInput!: ElementRef<HTMLInputElement>;

  // ============================================
  // PROPIEDADES DE USUARIO
  // ============================================
  user = {
    id: 0,
    nombre: 'Usuario',
    nombreCompleto: '',
    email: 'usuario@example.com',
    nivel_actual: 'basico',
    fecha_registro: new Date(),
    avatar: 'assets/image/msombra.png',
    activo: true,
    verificado: false
  };

  stats = {
    racha_dias_actual: 0,
    racha_dias_maxima: 0,
    total_dias_estudiados: 0,
    total_tests: 0,
    total_preguntas: 0,
    promedio_aciertos: 0
  };

  settings = {
    darkMode: false,
    soundEffects: true,
    vibration: true,
    autoSave: true
  };

  // ============================================
  // PROPIEDADES DE FRECUENCIA DE ESTUDIO
  // ============================================
  frecuenciaConfig: StudyFrequencyConfig = {
    frecuenciaSemanal: 3,
    objetivoDias: 'flexible',
    diasPreferidos: [],
    recordatorioActivo: true,
    horaRecordatorio: '19:00'
  };

  cumplimiento: any = null;
  isSaving: boolean = false;
  isLoading: boolean = true;
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Propiedades para el selector de hora
  horaSeleccionada: string = '19';
  minutoSeleccionado: string = '00';
  horas: string[] = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  minutos: string[] = ['00', '15', '30', '45'];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadAllUserData();
  }

  ngAfterViewInit() {
    // Forzar el valor del input después de que la vista se inicialice
    this.updateTimeInput();
  }

  // ============================================
  // CARGAR TODOS LOS DATOS DEL USUARIO
  // ============================================
  
  async loadAllUserData() {
    this.isLoading = true;

    try {
      // 1. Obtener usuario del localStorage
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.error('No hay usuario logueado');
        this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;
      
      // 2. Cargar información básica del usuario
      this.user.id = studentId;
      this.user.nombre = currentUser.name?.split(' ')[0] || 'Usuario';
      this.user.nombreCompleto = currentUser.name || 'Usuario';
      this.user.email = currentUser.email || 'usuario@example.com';

      console.log('👤 Usuario cargado:', this.user);

      // 3. Cargar estadísticas desde el dashboard
      await this.loadDashboardStats(studentId);

      // 4. Cargar configuración de frecuencia
      this.loadStudyFrequency();

      // 5. Cargar cumplimiento
      this.loadCumplimiento();

      // 6. Cargar configuración local
      this.loadSettings();

    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      await this.showToast('Error al cargar los datos del perfil', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // CARGAR ESTADÍSTICAS DEL DASHBOARD
  // ============================================
  
  async loadDashboardStats(studentId: number) {
    try {
      const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();
      
      if (statsResponse && statsResponse.success) {
        const data = statsResponse.data;
        
        // Mapear las estadísticas
        this.stats.total_tests = data.totalTests || 0;
        this.stats.total_preguntas = data.totalQuestions || 0;
        this.stats.promedio_aciertos = Math.round(data.successRate || 0);
        this.stats.racha_dias_actual = data.streak || 0;
        
        // La racha máxima y días estudiados vendrían de metricas_estudiante
        // Por ahora usamos valores calculados
        this.stats.racha_dias_maxima = Math.max(this.stats.racha_dias_actual, this.stats.racha_dias_maxima);
        this.stats.total_dias_estudiados = this.stats.racha_dias_actual; // Aproximación

        console.log('📊 Estadísticas cargadas:', this.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas del dashboard:', error);
    }
  }

  // ============================================
  // MÉTODOS DE FRECUENCIA DE ESTUDIO
  // ============================================
  
  loadStudyFrequency() {
  const studentId = this.user.id;
  
  this.apiService.getStudyFrequency(studentId).subscribe({
    next: (response) => {
      console.log('📥 RESPUESTA FRECUENCIA:', response);
      
      if (response.success && response.data) {
        console.log('⏰ HORA DE BD:', response.data.horaRecordatorio);
        
        // Extraer solo HH:mm (sin segundos)
        let horaFormateada = '19:00';
        
        if (response.data.horaRecordatorio) {
          const horaStr = response.data.horaRecordatorio.toString();
          const partes = horaStr.split(':');
          if (partes.length >= 2) {
            const horas = partes[0].padStart(2, '0');
            const minutos = partes[1].padStart(2, '0');
            horaFormateada = `${horas}:${minutos}`;
            
            // Separar para los selectores
            this.horaSeleccionada = horas;
            this.minutoSeleccionado = minutos;
          }
        }
        
        console.log('⏰ HORA FORMATEADA:', horaFormateada);
        
        this.frecuenciaConfig = {
          frecuenciaSemanal: response.data.frecuenciaSemanal || 3,
          objetivoDias: (response.data.objetivoDias as 'flexible' | 'estricto' | 'personalizado') || 'flexible',
          diasPreferidos: response.data.diasPreferidos || [],
          recordatorioActivo: response.data.recordatorioActivo ?? true,
          horaRecordatorio: horaFormateada
        };
        
        console.log('✅ Config frecuencia - Hora:', this.frecuenciaConfig.horaRecordatorio);
        console.log('🕐 Selectores - Hora:', this.horaSeleccionada, 'Minuto:', this.minutoSeleccionado);
      }
    },
    error: (error) => {
      console.error('❌ Error cargando frecuencia:', error);
    }
  });
}

  // Método para actualizar el input de tiempo
  updateTimeInput() {
    setTimeout(() => {
      if (this.timeInput && this.timeInput.nativeElement) {
        const hora = this.frecuenciaConfig.horaRecordatorio;
        console.log('🔄 Actualizando input a:', hora);
        this.timeInput.nativeElement.value = hora;
      }
    }, 100);
  }

  loadCumplimiento() {
    const studentId = this.user.id;
    
    this.apiService.getStudyFrequencyCumplimiento(studentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cumplimiento = response.data;
          console.log('✅ Cumplimiento cargado:', this.cumplimiento);
        }
      },
      error: (error) => {
        console.error('Error cargando cumplimiento:', error);
      }
    });
  }

  loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

  // ============================================
  // CONTROL DE FRECUENCIA
  // ============================================
  
  increaseFrecuencia() {
    if (this.frecuenciaConfig.frecuenciaSemanal < 7) {
      this.frecuenciaConfig.frecuenciaSemanal++;
    }
  }

  decreaseFrecuencia() {
    if (this.frecuenciaConfig.frecuenciaSemanal > 1) {
      this.frecuenciaConfig.frecuenciaSemanal--;
      if (this.frecuenciaConfig.diasPreferidos.length > this.frecuenciaConfig.frecuenciaSemanal) {
        this.frecuenciaConfig.diasPreferidos = this.frecuenciaConfig.diasPreferidos
          .slice(0, this.frecuenciaConfig.frecuenciaSemanal);
      }
    }
  }

  setFrecuencia(dias: number) {
    this.frecuenciaConfig.frecuenciaSemanal = dias;
    if (this.frecuenciaConfig.diasPreferidos.length > dias) {
      this.frecuenciaConfig.diasPreferidos = this.frecuenciaConfig.diasPreferidos.slice(0, dias);
    }
  }

  // ============================================
  // DÍAS PREFERIDOS
  // ============================================
  
  isDiaSelected(dia: number): boolean {
    return this.frecuenciaConfig.diasPreferidos.includes(dia);
  }

  toggleDia(dia: number) {
    const index = this.frecuenciaConfig.diasPreferidos.indexOf(dia);
    
    if (index > -1) {
      this.frecuenciaConfig.diasPreferidos.splice(index, 1);
    } else {
      if (this.frecuenciaConfig.diasPreferidos.length < this.frecuenciaConfig.frecuenciaSemanal) {
        this.frecuenciaConfig.diasPreferidos.push(dia);
        this.frecuenciaConfig.diasPreferidos.sort((a, b) => a - b);
      }
    }
  }

  // ============================================
  // RECORDATORIOS
  // ============================================
  
  onRecordatorioChange() {
    console.log('Recordatorio:', this.frecuenciaConfig.recordatorioActivo);
  }

  onHoraMinutoChange() {
  this.frecuenciaConfig.horaRecordatorio = `${this.horaSeleccionada}:${this.minutoSeleccionado}`;
  console.log('🕐 Hora actualizada:', this.frecuenciaConfig.horaRecordatorio);
}

  onTimeChange(event: any) {
    const newTime = event.target.value;
    console.log('🕐 Hora cambiada a:', newTime);
    this.frecuenciaConfig.horaRecordatorio = newTime;
  }

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  
  async saveFrequency() {
    this.isSaving = true;

    // Asegurar formato correcto antes de guardar (solo HH:mm)
    const configToSave = {
      ...this.frecuenciaConfig,
      horaRecordatorio: this.frecuenciaConfig.horaRecordatorio.substring(0, 5)
    };

    console.log('💾 Guardando config:', configToSave);

    this.apiService.updateStudyFrequency(this.user.id, configToSave).subscribe({
      next: async (response) => {
        this.isSaving = false;
        
        if (response.success) {
          await this.showToast('✅ Configuración guardada correctamente', 'success');
          this.loadCumplimiento();
        } else {
          await this.showToast('⚠️ No se pudo guardar la configuración', 'warning');
        }
      },
      error: async (error) => {
        this.isSaving = false;
        console.error('Error guardando frecuencia:', error);
        await this.showToast('❌ Error al guardar la configuración', 'danger');
      }
    });
  }

  // ============================================
  // INFORMACIÓN DEL USUARIO
  // ============================================

  getNivelFormatted(): string {
    const niveles: any = {
      'basico': 'Básico',
      'intermedio': 'Intermedio',
      'avanzado': 'Avanzado'
    };
    return niveles[this.user.nivel_actual] || 'Básico';
  }

  getFechaRegistroFormatted(): string {
    const fecha = new Date(this.user.fecha_registro);
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  async editProfile() {
    const alert = await this.alertController.create({
      header: 'Editar Perfil',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async changeAvatar() {
    const alert = await this.alertController.create({
      header: 'Cambiar Foto',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => {
            localStorage.removeItem('currentUser');
            this.router.navigate(['/welcome2']);
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // ============================================
  // MENSAJES DE PROGRESO
  // ============================================
  
  getProgressMessage(): string {
    if (!this.cumplimiento) return '';

    const porcentaje = this.cumplimiento.porcentajeCumplimiento;
    const faltantes = this.cumplimiento.objetivoSemanal - this.cumplimiento.diasEstudiadosSemana;

    if (porcentaje >= 100) {
      return '¡Objetivo cumplido! 🎉';
    } else if (porcentaje >= 75) {
      return `¡Vas muy bien! Solo ${faltantes} día${faltantes > 1 ? 's' : ''} más`;
    } else if (porcentaje >= 50) {
      return `Buen avance. Faltan ${faltantes} día${faltantes > 1 ? 's' : ''}`;
    } else if (porcentaje > 0) {
      return `Sigue así. Faltan ${faltantes} día${faltantes > 1 ? 's' : ''}`;
    } else {
      return '¡Comienza hoy! 💪';
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================
  
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  // ============================================
  // MÉTODOS DE NAVEGACIÓN Y ACCIONES
  // ============================================

  async viewHistory() {
    const alert = await this.alertController.create({
      header: 'Historial',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async viewAchievements() {
    const alert = await this.alertController.create({
      header: 'Logros',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(this.settings));
    this.showToast('⚙️ Configuración guardada', 'success');
  }

  async getHelp() {
    const alert = await this.alertController.create({
      header: 'Ayuda y Soporte',
      message: 'Para obtener ayuda, contacta con soporte@ejemplo.com',
      buttons: ['OK']
    });
    await alert.present();
  }

  async aboutApp() {
    const alert = await this.alertController.create({
      header: 'Acerca de',
      message: 'Aplicación de Estudio\nVersión 1.0.0\n\n© 2025 Todos los derechos reservados.',
      buttons: ['OK']
    });
    await alert.present();
  }
}