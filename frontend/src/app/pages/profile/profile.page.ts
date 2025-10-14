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

  cumplimiento: any = null;
  isSaving: boolean = false;
  isLoading: boolean = true;
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Propiedades para el selector de hora
  horaSeleccionada: string = '19';
  minutoSeleccionado: string = '00';
  horas: string[] = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  minutos: string[] = ['00', '15', '30', '45'];

  // ============================================
  // ✅ NUEVAS PROPIEDADES DE MODO ADAPTATIVO
  // ============================================

  hasUnsavedChanges: boolean = false;
  originalConfig: StudyFrequencyConfig | null = null;


  adaptiveConfig = {
    enabled: false
  };

   // Control de acordeones
    expandedSections: { [key: string]: boolean } = {
    personalInfo: false,
    adaptiveMode: false,
    studyFrequency: false,
    progress: false,
    configuration: false
  };

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
    this.updateTimeInput();
  }

  // ============================================
  // CARGAR TODOS LOS DATOS DEL USUARIO
  // ============================================
  
  async loadAllUserData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.error('No hay usuario logueado');
        this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;
      
      this.user.id = studentId;
      this.user.nombre = currentUser.name?.split(' ')[0] || 'Usuario';
      this.user.nombreCompleto = currentUser.name || 'Usuario';
      this.user.email = currentUser.email || 'usuario@example.com';

      console.log('👤 Usuario cargado:', this.user);

      await this.loadDashboardStats(studentId);
      this.loadCumplimiento();
      this.loadSettings();
      this.loadStudyFrequency();
      
      // ✅ NUEVO: Cargar modo adaptativo
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
  // ✅ MÉTODOS DE MODO ADAPTATIVO
  // ============================================
  
  loadAdaptiveConfig() {
    const studentId = this.user.id;
    
    if (!studentId || studentId === 0) {
      console.log('⚠️ No hay studentId válido para cargar config adaptativa');
      return;
    }

    // ✅ Cargar desde la base de datos
    this.apiService.getAdaptiveModeConfig(studentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adaptiveConfig.enabled = response.data.adaptiveModeEnabled || false;
          console.log('✅ Modo adaptativo cargado desde BD:', this.adaptiveConfig);
          
          // También guardar en localStorage como backup
          localStorage.setItem(
            `adaptive_mode_${this.user.id}`, 
            JSON.stringify(this.adaptiveConfig)
          );
        }
      },
      error: (error) => {
        console.error('❌ Error cargando modo adaptativo:', error);
        
        // Fallback: intentar cargar desde localStorage
        const saved = localStorage.getItem(`adaptive_mode_${this.user.id}`);
        if (saved) {
          try {
            this.adaptiveConfig = JSON.parse(saved);
            console.log('ℹ️ Modo adaptativo cargado desde localStorage:', this.adaptiveConfig);
          } catch (e) {
            this.adaptiveConfig = { enabled: false };
          }
        }
      }
    });
  }

  async onAdaptiveModeChange() {
    console.log('🎯 Modo adaptativo:', this.adaptiveConfig.enabled ? 'ACTIVADO' : 'DESACTIVADO');
    
    // ✅ GUARDAR AUTOMÁTICAMENTE al cambiar el toggle
    await this.saveAdaptiveConfig();
  }

  async saveAdaptiveConfig() {
    this.isSaving = true;

    try {
      // ✅ Guardar en la base de datos
      const response = await this.apiService.updateAdaptiveModeConfig(
        this.user.id, 
        this.adaptiveConfig.enabled
      ).toPromise();

      if (response && response.success) {
        console.log('💾 Modo adaptativo guardado en BD:', response);
        
        // También guardar en localStorage como backup
        localStorage.setItem(
          `adaptive_mode_${this.user.id}`, 
          JSON.stringify(this.adaptiveConfig)
        );

        await this.showToast(
          this.adaptiveConfig.enabled 
            ? '✅ Modo Adaptativo activado correctamente'
            : '✅ Modo Adaptativo desactivado',
          'success'
        );
      } else {
        throw new Error('No se pudo guardar la configuración');
      }

    } catch (error: any) {
      console.error('Error guardando adaptive config:', error);
      
      // Revertir el cambio en caso de error
      this.adaptiveConfig.enabled = !this.adaptiveConfig.enabled;
      
      await this.showToast(
        error.friendlyMessage || '❌ Error al guardar la configuración', 
        'danger'
      );
    } finally {
      this.isSaving = false;
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
        
        let horaFormateada = '19:00';
        
        if (response.data.horaRecordatorio) {
          const horaStr = response.data.horaRecordatorio.toString();
          const partes = horaStr.split(':');
          if (partes.length >= 2) {
            const horas = partes[0].padStart(2, '0');
            const minutos = partes[1].padStart(2, '0');
            horaFormateada = `${horas}:${minutos}`;
            
            this.horaSeleccionada = horas;
            this.minutoSeleccionado = minutos;
          }
        }
        
        this.frecuenciaConfig = {
          frecuenciaSemanal: response.data.frecuenciaSemanal || 3,
          objetivoDias: (response.data.objetivoDias as 'flexible' | 'estricto' | 'personalizado') || 'flexible',
          diasPreferidos: response.data.diasPreferidos || [],
          recordatorioActivo: response.data.recordatorioActivo ?? true,
          horaRecordatorio: horaFormateada
        };
        
        this.updateObjetivoMode();
        
        // ✅ NUEVO: Guardar configuración original
        this.originalConfig = JSON.parse(JSON.stringify(this.frecuenciaConfig));
        this.hasUnsavedChanges = false;
        
        console.log('✅ Config frecuencia completa:', this.frecuenciaConfig);
      }
    },
    error: (error) => {
      console.error('❌ Error cargando frecuencia:', error);
    }
  });
}

// ============================================
// ✅ NUEVO: Detectar cambios en configuración
// ============================================
checkForChanges() {
  if (!this.originalConfig) {
    this.hasUnsavedChanges = false;
    return;
  }

  // Comparar configuraciones
  const hasChanged = 
    this.frecuenciaConfig.frecuenciaSemanal !== this.originalConfig.frecuenciaSemanal ||
    this.frecuenciaConfig.objetivoDias !== this.originalConfig.objetivoDias ||
    this.frecuenciaConfig.recordatorioActivo !== this.originalConfig.recordatorioActivo ||
    this.frecuenciaConfig.horaRecordatorio !== this.originalConfig.horaRecordatorio ||
    JSON.stringify(this.frecuenciaConfig.diasPreferidos.sort()) !== 
    JSON.stringify(this.originalConfig.diasPreferidos.sort());

  this.hasUnsavedChanges = hasChanged;
  
  if (hasChanged) {
    console.log('⚠️ Hay cambios sin guardar');
  }
}

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
      this.checkForChanges();
    }
  }

  decreaseFrecuencia() {
    if (this.frecuenciaConfig.frecuenciaSemanal > 1) {
      this.frecuenciaConfig.frecuenciaSemanal--;
      if (this.frecuenciaConfig.diasPreferidos.length > this.frecuenciaConfig.frecuenciaSemanal) {
        this.frecuenciaConfig.diasPreferidos = this.frecuenciaConfig.diasPreferidos
          .slice(0, this.frecuenciaConfig.frecuenciaSemanal);
      }
      this.checkForChanges();
    }
  }

  setFrecuencia(dias: number) {
    this.frecuenciaConfig.frecuenciaSemanal = dias;
    if (this.frecuenciaConfig.diasPreferidos.length > dias) {
      this.frecuenciaConfig.diasPreferidos = this.frecuenciaConfig.diasPreferidos.slice(0, dias);
    }
    this.checkForChanges();
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
      // Remover día
      this.frecuenciaConfig.diasPreferidos.splice(index, 1);
    } else {
      // Agregar día (sin límite de cantidad)
      this.frecuenciaConfig.diasPreferidos.push(dia);
      this.frecuenciaConfig.diasPreferidos.sort((a, b) => a - b);
    }
    
    // ✅ NUEVO: Actualizar automáticamente el modo
    this.updateObjetivoMode();
    this.checkForChanges();
  }

  // ============================================
  // ✅ NUEVO: Actualizar modo automáticamente
  // ============================================
  updateObjetivoMode() {
    if (this.frecuenciaConfig.diasPreferidos.length > 0) {
      // Si hay días seleccionados → Modo estricto
      this.frecuenciaConfig.objetivoDias = 'estricto';
      console.log('🎯 Modo cambiado a ESTRICTO (días seleccionados:', this.frecuenciaConfig.diasPreferidos, ')');
    } else {
      // Si no hay días seleccionados → Modo flexible
      this.frecuenciaConfig.objetivoDias = 'flexible';
      console.log('🎯 Modo cambiado a FLEXIBLE (sin días específicos)');
    }
  }
  // ============================================
  // RECORDATORIOS
  // ============================================
  
  onRecordatorioChange() {
    console.log('Recordatorio:', this.frecuenciaConfig.recordatorioActivo);
    this.checkForChanges();
  }

  onHoraMinutoChange() {
    this.frecuenciaConfig.horaRecordatorio = `${this.horaSeleccionada}:${this.minutoSeleccionado}`;
    console.log('🕐 Hora actualizada:', this.frecuenciaConfig.horaRecordatorio);
    this.checkForChanges();
  }

  onTimeChange(event: any) {
    const newTime = event.target.value;
    console.log('🕐 Hora cambiada a:', newTime);
    this.frecuenciaConfig.horaRecordatorio = newTime;
    this.checkForChanges(); 
  }

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  
async saveFrequency() {
  this.isSaving = true;

  const configToSave = {
    ...this.frecuenciaConfig,
    horaRecordatorio: this.frecuenciaConfig.horaRecordatorio.substring(0, 5)
  };

  console.log('💾 Guardando config:', configToSave);

  this.apiService.updateStudyFrequency(this.user.id, configToSave).subscribe({
    next: async (response) => {
      this.isSaving = false;
      
      if (response.success) {
        // ✅ NUEVO: Actualizar configuración original y resetear cambios
        this.originalConfig = JSON.parse(JSON.stringify(this.frecuenciaConfig));
        this.hasUnsavedChanges = false;
        
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
    const nivel = this.user.nivel_actual?.toLowerCase() || 'basico';
    
    const niveles: { [key: string]: string } = {
      'basico': 'Básico',
      'intermedio': 'Intermedio',
      'avanzado': 'Avanzado',
      'experto': 'Experto'
    };
    
    return niveles[nivel] || 'Básico';
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

  ionViewWillEnter() {
    console.log('🔄 Profile: Recargando datos al entrar a la página');
    this.loadAllUserData();
  }
  
 toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  // ============================================
  // EDITAR NOMBRE Y EMAIL
  // ============================================

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
    if (!this.canEditProfile()) {
      const daysLeft = this.getDaysUntilCanEdit();
      await this.showToast(
        `Podrás cambiar tu nombre en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
        'warning'
      );
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cambiar Nombre',
      message: 'Solo puedes cambiar tu nombre cada 30 días.',
      inputs: [
        {
          name: 'newName',
          type: 'text',
          placeholder: 'Nuevo nombre',
          value: this.user.nombre
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (data.newName && data.newName.trim().length > 0) {
              this.updateName(data.newName.trim());
              return true;  // ✅ AGREGADO
            } else {
              this.showToast('El nombre no puede estar vacío', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editEmail() {
    if (!this.canEditProfile()) {
      const daysLeft = this.getDaysUntilCanEdit();
      await this.showToast(
        `Podrás cambiar tu email en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
        'warning'
      );
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cambiar Email',
      message: 'Solo puedes cambiar tu email cada 30 días.',
      inputs: [
        {
          name: 'newEmail',
          type: 'email',
          placeholder: 'Nuevo email',
          value: this.user.email
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (this.isValidEmail(data.newEmail)) {
              this.updateEmail(data.newEmail.trim());
              return true; 
            } else {
              this.showToast('Email inválido', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

async updateName(newName: string): Promise<void> {
    try {
      const response = await this.apiService.updateUserProfile(this.user.id, {
        name: newName
      }).toPromise();

      if (response && response.success) {
        this.user.nombre = newName;
        this.user.nombreCompleto = newName;
        this.user.last_profile_update = new Date().toISOString();
        
        const currentUser = this.apiService.getCurrentUser();
        if (currentUser) {
          currentUser.name = newName;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        await this.showToast('✅ Nombre actualizado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error actualizando nombre:', error);
      await this.showToast('❌ Error al actualizar el nombre', 'danger');
    }
  }

  async updateEmail(newEmail: string): Promise<void> {
    try {
      const response = await this.apiService.updateUserProfile(this.user.id, {
        email: newEmail
      }).toPromise();

      if (response && response.success) {
        this.user.email = newEmail;
        this.user.last_profile_update = new Date().toISOString();
        
        const currentUser = this.apiService.getCurrentUser();
        if (currentUser) {
          currentUser.email = newEmail;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        await this.showToast('✅ Email actualizado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error actualizando email:', error);
      await this.showToast('❌ Error al actualizar el email', 'danger');
    }
  }

}