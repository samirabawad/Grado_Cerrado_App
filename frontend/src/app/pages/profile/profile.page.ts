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
    verificado: false,
    last_profile_update: null as string | null 
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

  isSaving: boolean = false;
  isLoading: boolean = true;
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Propiedades para el selector de hora
  horaSeleccionada: string = '19';
  minutoSeleccionado: string = '00';
  horas: string[] = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  minutos: string[] = ['00', '15', '30', '45'];

  // ============================================
  // SECCIONES EXPANDIBLES
  // ============================================
  expandedSections: { [key: string]: boolean } = {
    personalInfo: false,
    adaptiveMode: false,
    frequency: false, // ✅ CERRADA por defecto
    weeklyGoal: false, // ✅ Subsección
    preferredDays: false, // ✅ Subsección
    reminders: false, // ✅ Subsección
    progress: false,
    configuration: false
  };

  hasUnsavedChanges: boolean = false;

  // ============================================
  // MODO ADAPTATIVO
  // ============================================
  adaptiveModeEnabled: boolean = false;
  isLoadingAdaptive: boolean = false;
  isSavingAdaptive: boolean = false;
  adaptiveConfig: any = { enabled: false };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadAllUserData();
  }

  ngAfterViewInit() {
  }

  // ============================================
  // CARGAR TODOS LOS DATOS
  // ============================================
  async loadAllUserData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        await this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;
      
      this.user.id = studentId;
      this.user.nombre = currentUser.name || 'Usuario';
      this.user.email = currentUser.email || 'usuario@example.com';

      await this.loadDashboardStats(studentId);
      this.loadSettings();
      this.loadStudyFrequency();
      this.loadAdaptiveConfig();

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
        
        this.stats.total_tests = data.totalTests || 0;
        this.stats.total_preguntas = data.totalQuestions || 0;
        this.stats.promedio_aciertos = Math.round(data.successRate || 0);
        this.stats.racha_dias_actual = data.streak || 0;
        this.stats.racha_dias_maxima = Math.max(this.stats.racha_dias_actual, this.stats.racha_dias_maxima);
        this.stats.total_dias_estudiados = this.stats.racha_dias_actual;

        console.log('📊 Estadísticas cargadas:', this.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas del dashboard:', error);
    }
  }

  // ============================================
  // MÉTODOS DE FRECUENCIA
  // ============================================

  increaseFrequency() {
    if (this.frecuenciaConfig.frecuenciaSemanal < 7) {
      this.frecuenciaConfig.frecuenciaSemanal++;
      this.hasUnsavedChanges = true;
    }
  }

  decreaseFrequency() {
    if (this.frecuenciaConfig.frecuenciaSemanal > 1) {
      this.frecuenciaConfig.frecuenciaSemanal--;
      this.hasUnsavedChanges = true;
    }
  }

  setFrequency(days: number) {
    this.frecuenciaConfig.frecuenciaSemanal = days;
    this.hasUnsavedChanges = true;
  }

  toggleDay(dayIndex: number) {
    const index = this.frecuenciaConfig.diasPreferidos.indexOf(dayIndex);
    if (index > -1) {
      this.frecuenciaConfig.diasPreferidos.splice(index, 1);
    } else {
      this.frecuenciaConfig.diasPreferidos.push(dayIndex);
    }
    this.frecuenciaConfig.diasPreferidos.sort();
    this.hasUnsavedChanges = true;
  }

  isDaySelected(dayIndex: number): boolean {
    return this.frecuenciaConfig.diasPreferidos.includes(dayIndex);
  }

  onFrequencyChange() {
    this.hasUnsavedChanges = true;
  }

  updateTimeFromPicker() {
    this.frecuenciaConfig.horaRecordatorio = `${this.horaSeleccionada}:${this.minutoSeleccionado}`;
    this.hasUnsavedChanges = true;
  }

  async saveFrequencyConfig() {
    if (!this.hasUnsavedChanges) return;

    this.isSaving = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        await this.showToast('Error: Usuario no identificado', 'danger');
        this.isSaving = false;
        return;
      }

      const response = await this.apiService.updateStudyFrequency(
        currentUser.id,
        this.frecuenciaConfig
      ).toPromise();

      if (response && response.success) {
        await this.showToast('✅ Configuración guardada exitosamente', 'success');
        this.hasUnsavedChanges = false;
      } else {
        await this.showToast('❌ Error al guardar la configuración', 'danger');
      }
    } catch (error) {
      console.error('Error guardando frecuencia:', error);
      await this.showToast('❌ Error al guardar la configuración', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  loadStudyFrequency() {
    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) return;

      this.apiService.getStudyFrequency(currentUser.id).subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            const objetivoDias = response.data.objetivoDias;
            
            this.frecuenciaConfig = {
              frecuenciaSemanal: response.data.frecuenciaSemanal || 3,
              objetivoDias: (objetivoDias === 'flexible' || objetivoDias === 'estricto' || objetivoDias === 'personalizado') 
                ? objetivoDias 
                : 'flexible',
              diasPreferidos: response.data.diasPreferidos || [],
              recordatorioActivo: response.data.recordatorioActivo !== false,
              horaRecordatorio: response.data.horaRecordatorio || '19:00'
            };

            const [hora, minuto] = this.frecuenciaConfig.horaRecordatorio.split(':');
            this.horaSeleccionada = hora;
            this.minutoSeleccionado = minuto;

            console.log('✅ Frecuencia cargada:', this.frecuenciaConfig);
          }
        },
        error: (error) => {
          console.error('Error cargando frecuencia:', error);
        }
      });
    } catch (error) {
      console.error('Error cargando frecuencia:', error);
    }
  }


  // ============================================
  // MODO ADAPTATIVO
  // ============================================

  async loadAdaptiveConfig() {
    this.isLoadingAdaptive = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) return;

      const response = await this.apiService.getAdaptiveModeConfig(currentUser.id).toPromise();
      
      if (response && response.success && response.data) {
        this.adaptiveModeEnabled = response.data.adaptiveModeEnabled || false;
        this.adaptiveConfig.enabled = this.adaptiveModeEnabled;
        console.log('🎯 Modo adaptativo cargado:', this.adaptiveModeEnabled);
      }
    } catch (error) {
      console.error('Error cargando modo adaptativo:', error);
    } finally {
      this.isLoadingAdaptive = false;
    }
  }

  async onAdaptiveModeChange() {
    this.isSavingAdaptive = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        await this.showToast('Error: Usuario no identificado', 'danger');
        this.isSavingAdaptive = false;
        return;
      }

      const response = await this.apiService.updateAdaptiveModeConfig(
        currentUser.id,
        this.adaptiveConfig.enabled
      ).toPromise();

      if (response && response.success) {
        this.adaptiveModeEnabled = this.adaptiveConfig.enabled;
        const message = this.adaptiveConfig.enabled
          ? '✅ Modo adaptativo activado' 
          : '✅ Modo adaptativo desactivado';
        await this.showToast(message, 'success');
      } else {
        this.adaptiveConfig.enabled = !this.adaptiveConfig.enabled;
        await this.showToast('❌ Error al cambiar el modo adaptativo', 'danger');
      }
    } catch (error: any) {
      console.error('Error guardando modo adaptativo:', error);
      this.adaptiveConfig.enabled = !this.adaptiveConfig.enabled;
      await this.showToast('❌ Error al guardar la configuración', 'danger');
    } finally {
      this.isSavingAdaptive = false;
    }
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

  saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(this.settings));
    this.showToast('⚙️ Configuración guardada', 'success');
  }

  // ============================================
  // SECCIONES
  // ============================================

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // ============================================
  // UTILIDADES
  // ============================================

  getNivelFormatted(): string {
    const niveles: { [key: string]: string } = {
      'basico': 'Básico',
      'intermedio': 'Intermedio',
      'avanzado': 'Avanzado'
    };
    return niveles[this.user.nivel_actual] || 'Básico';
  }

  getFechaRegistroFormatted(): string {
    return this.user.fecha_registro.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  canEditProfile(): boolean {
    if (!this.user.last_profile_update) return true;
    
    const lastUpdate = new Date(this.user.last_profile_update);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceUpdate >= 30;
  }

  getDaysUntilCanEdit(): number {
    if (!this.user.last_profile_update) return 0;
    
    const lastUpdate = new Date(this.user.last_profile_update);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, 30 - daysSinceUpdate);
  }

  getLastUpdateFormatted(): string {
    if (!this.user.last_profile_update) return 'Nunca';
    
    const lastUpdate = new Date(this.user.last_profile_update);
    return lastUpdate.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  async editName() {
    const alert = await this.alertController.create({
      header: 'Editar Nombre',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async editEmail() {
    const alert = await this.alertController.create({
      header: 'Editar Email',
      message: 'Función en desarrollo.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top',
      color
    });
    await toast.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'confirm',
          handler: () => {
            this.apiService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async viewHistory() {
    this.router.navigate(['/dashboard']);
  }

  async viewAchievements() {
    this.router.navigate(['/racha']);
  }

  ionViewWillEnter() {
    console.log('🔄 Profile: Recargando datos al entrar a la página');
    this.loadAllUserData();
  }
}