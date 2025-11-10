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

  // ======== NUEVO: input para subir foto ========
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
    // avatar original que tenías
    avatar: 'assets/image/msombra.png',
    // ======== NUEVO: url unificada para mostrar en UI ========
    avatarUrl: '' as string,
    activo: true,
    verificado: false,
    last_profile_update: null as string | null
  };


// ======== NUEVO: configuración de avatares ========
defaultAvatar = 'assets/image/msombra.png';
raccoonAvatars: { id: number; url: string }[] = [
  { id: 1, url: 'assets/avatars/racoon1.svg' },
  { id: 2, url: 'assets/avatars/racoon2.svg' },
];
avatarPickerOpen = false;
pendingAvatar: { id: number; url: string } | null = null;


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
    security: false,
    adaptiveMode: false,
    frequency: false,
    weeklyGoal: false,
    preferredDays: false,
    reminders: false,
    progress: false,
    configuration: false,
    account: false
  };
  hasUnsavedChanges: boolean = false;

  // ============================================
  // CONTRASEÑA – FORM
  // ============================================
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  isChangingPassword: boolean = false;

  isPasswordFormValid(): boolean {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm;
    return !!currentPassword && !!newPassword && newPassword.length >= 6 && newPassword === confirmPassword;
  }

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
    this.loadCorrectionConfig();
  }

  ngAfterViewInit() {}

  // ============================================
  // CARGAR TODOS LOS DATOS
  // ============================================
  async loadAllUserData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        console.warn('⚠️ No hay usuario logueado');
        this.isLoading = false;
        await this.router.navigate(['/login']);
        return;
      }

      const studentId = currentUser.id;

      // Usar los datos del usuario almacenados en localStorage
      this.user.id = currentUser.id;
      this.user.nombre = currentUser.name || 'Usuario';
      this.user.nombreCompleto = currentUser.name || 'Usuario';
      this.user.email = currentUser.email || 'usuario@example.com';

      // ======== NUEVO: setear avatarUrl desde localStorage o default ========
      this.user.avatarUrl = currentUser.avatarUrl || currentUser.avatar || this.user.avatar || this.defaultAvatar;

      console.log('✅ Usuario cargado desde localStorage:', this.user);

      await this.loadDashboardStats(studentId);
      this.loadSettings();
      this.loadStudyFrequency();
      this.loadAdaptiveConfig();

    } catch (error) {
      console.error('❌ Error cargando datos del usuario:', error);
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
  // CONFIGURACIÓN DE CORRECCIÓN
  // ============================================
  correctionConfig: any = {
    immediate: true // Por defecto corrección inmediata
  };

// ============================================
  // SECCIONES
  // ============================================
  toggleSection(section: string) {
    // Si la sección ya está abierta, la cerramos
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      // Cerrar todas las secciones principales
      Object.keys(this.expandedSections).forEach(key => {
        // Solo cerrar secciones principales, no subsecciones
        if (['personalInfo', 'security', 'adaptiveMode', 'frequency', 'progress', 'settings'].includes(key)) {
          this.expandedSections[key] = false;
        }
      });
      // Abrir la sección clickeada
      this.expandedSections[section] = true;
    }
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
      message: 'Ingresa tu nombre completo',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre *',
          value: this.user.nombre,
          attributes: {
            required: true
          }
        },
        {
          name: 'segundoNombre',
          type: 'text',
          placeholder: 'Segundo nombre (opcional)',
          value: ''
        },
        {
          name: 'apellidoPaterno',
          type: 'text',
          placeholder: 'Apellido paterno *',
          value: '',
          attributes: {
            required: true
          }
        },
        {
          name: 'apellidoMaterno',
          type: 'text',
          placeholder: 'Apellido materno (opcional)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.nombre || data.nombre.trim() === '') {
              await this.showToast('El nombre es obligatorio', 'danger');
              return false;
            }

            if (!data.apellidoPaterno || data.apellidoPaterno.trim() === '') {
              await this.showToast('El apellido paterno es obligatorio', 'danger');
              return false;
            }

            try {
              const updates = {
                nombre: data.nombre.trim(),
                apellidoPaterno: data.apellidoPaterno.trim(),
                segundoNombre: data.segundoNombre?.trim() || null,
                apellidoMaterno: data.apellidoMaterno?.trim() || null
              };

              const response = await this.apiService.updateUserProfile(this.user.id, updates).toPromise();

              if (response && response.success) {
                // Actualizar datos locales
                this.user.nombre = response.data.nombre;
                this.user.nombreCompleto = response.data.nombreCompleto;
                this.user.last_profile_update = response.data.fechaModificacion;

                // Actualizar localStorage
                const currentUser = this.apiService.getCurrentUser();
                if (currentUser) {
                  currentUser.name = response.data.nombre;
                  localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                await this.showToast('✅ Perfil actualizado exitosamente', 'success');
              }
            } catch (error: any) {
              console.error('❌ Error actualizando nombre:', error);
              await this.showToast(error.friendlyMessage || 'Error al actualizar el perfil', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async editEmail() {
    const alert = await this.alertController.create({
      header: 'Editar Email',
      message: 'Ingresa un email válido con dominio real (ejemplo: @gmail.com, @outlook.com)',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'nuevo@email.com',
          value: this.user.email,
          attributes: {
            required: true,
            autocomplete: 'email'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.email || data.email.trim() === '') {
              await this.showToast('El email es obligatorio', 'danger');
              return false;
            }

            const emailTrimmed = data.email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailTrimmed)) {
              await this.showToast('Formato de email inválido', 'danger');
              return false;
            }

            const dominiosValidos = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com'];
            const dominio = emailTrimmed.split('@')[1];

            if (!dominiosValidos.includes(dominio)) {
              const confirmar = confirm(`El dominio "${dominio}" no es común. ¿Estás seguro que es correcto?`);
              if (!confirmar) {
                return false;
              }
            }

            try {
              const updates = {
                email: emailTrimmed
              };

              const response = await this.apiService.updateUserProfile(this.user.id, updates).toPromise();

              if (response && response.success) {
                this.user.email = response.data.email;
                this.user.last_profile_update = response.data.fechaModificacion;

                const currentUser = this.apiService.getCurrentUser();
                if (currentUser) {
                  currentUser.email = response.data.email;
                  localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                await this.showToast('Email actualizado exitosamente', 'success');
              }
            } catch (error: any) {
              console.error('Error actualizando email:', error);
              await this.showToast(error.friendlyMessage || 'Error al actualizar el email', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Cambiar Contraseña',
      message: 'Ingresa tu contraseña actual y la nueva contraseña',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual',
          attributes: {
            required: true,
            autocomplete: 'current-password'
          }
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña (mínimo 6 caracteres)',
          attributes: {
            required: true,
            autocomplete: 'new-password',
            minlength: 6
          }
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña',
          attributes: {
            required: true,
            autocomplete: 'new-password'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: async (data) => {
            if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
              await this.showToast('Todos los campos son obligatorios', 'danger');
              return false;
            }

            if (data.newPassword.length < 6) {
              await this.showToast('La nueva contraseña debe tener al menos 6 caracteres', 'danger');
              return false;
            }

            if (data.newPassword !== data.confirmPassword) {
              await this.showToast('Las contraseñas no coinciden', 'danger');
              return false;
            }

            try {
              const passwords = {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword
              };

              const response = await this.apiService.changePassword(this.user.id, passwords).toPromise();

              if (response && response.success) {
                await this.showToast('Contraseña actualizada exitosamente', 'success');
              }
            } catch (error: any) {
              console.error('Error cambiando contraseña:', error);
              await this.showToast(error.friendlyMessage || 'Error al cambiar la contraseña', 'danger');
            }

            return true;
          }
        }
      ]
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

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Eliminar Cuenta',
      message: 'Esta acción es permanente y eliminará todos tus datos. Por favor ingresa tu contraseña para confirmar:',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Contraseña actual'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar Cuenta',
          role: 'destructive',
          handler: async (data) => {
            if (!data.password) {
              await this.showToast('Debes ingresar tu contraseña', 'danger');
              return false;
            }

            try {
              const userId = this.user.id;
              const response = await this.apiService.deleteAccount(userId, data.password).toPromise();

              if (response.success) {
                await this.showToast('Cuenta eliminada exitosamente', 'success');
                this.apiService.logout();
                this.router.navigate(['/login']);
              } else {
                await this.showToast(response.message || 'Error al eliminar cuenta', 'danger');
                return false;
              }
            } catch (error: any) {
              console.error('Error eliminando cuenta:', error);
              await this.showToast(error.error?.message || 'Error al eliminar cuenta', 'danger');
              return false;
            }
            return true;
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
    this.router.navigate(['/historial']);
  }

  async viewAchievements() {
    this.router.navigate(['/logros']);
  }

  ionViewWillEnter() {
    console.log('🔄 Profile: Recargando datos al entrar a la página');
    this.loadAllUserData();
  }

  // ============================================
  // CONFIGURACIÓN DE CORRECCIÓN
  // ============================================
  loadCorrectionConfig() {
    const saved = localStorage.getItem('correctionConfig');
    if (saved) {
      this.correctionConfig = JSON.parse(saved);
    } else {
      this.correctionConfig = { immediate: true };
    }
    console.log('✅ Configuración de corrección cargada:', this.correctionConfig);
  }

  async onCorrectionModeChange() {
    try {
      localStorage.setItem('correctionConfig', JSON.stringify(this.correctionConfig));
      console.log('💾 Configuración de corrección guardada:', this.correctionConfig);
    } catch (error) {
      console.error('Error guardando configuración de corrección:', error);
      await this.showToast('❌ Error al guardar la configuración', 'danger');
    }
  }

  
  // ============================================
  // AVATAR / FOTO DE PERFIL
  // ============================================
  openAvatarPicker() { this.avatarPickerOpen = true; this.pendingAvatar = null; }
  closeAvatarPicker() { this.avatarPickerOpen = false; this.pendingAvatar = null; }
  selectAvatar(a: { id: number; url: string }) { this.pendingAvatar = a; }

  async saveSelectedAvatar() {
    if (!this.pendingAvatar) return;
    try {
      const current = this.apiService.getCurrentUser();
      await this.apiService.updateUserAvatar(current.id, { avatarId: this.pendingAvatar.id, avatarUrl: null }).toPromise();

      // Refresca UI (el back mapeará id->url pública si aplica). Para assets locales, queda igual.
      this.user.avatarUrl = this.apiService.toAbsoluteFileUrl(this.pendingAvatar.url);

      // Sincroniza localStorage
      current.avatarUrl = this.user.avatarUrl;
      current.avatar = this.user.avatarUrl;
      localStorage.setItem('currentUser', JSON.stringify(current));

      await this.showToast('✅ Avatar actualizado', 'success');
    } catch (e) {
      console.error(e);
      await this.showToast('No se pudo actualizar el avatar', 'danger');
    } finally {
      this.closeAvatarPicker();
    }
  }

  triggerFile() {
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.click();
  }

  async onFileSelected(ev: any) {
    const file: File | undefined = ev?.target?.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      await this.showToast('La imagen excede 2MB', 'danger');
      ev.target.value = '';
      return;
    }

    try {
      const current = this.apiService.getCurrentUser();

      // Subir al backend
      const form = new FormData();
      form.append('file', file);
      const resp = await this.apiService.uploadProfilePhoto(current.id, form).toPromise();

      // El back responde { data: { url: "/avatars/xxxxx.png" } }
      const rawUrl = resp?.data?.url as string;
      const absoluteUrl = this.apiService.toAbsoluteFileUrl(rawUrl);

      // Refrescar UI / localStorage
      this.user.avatarUrl = absoluteUrl;
      current.avatarUrl = absoluteUrl;
      current.avatar = absoluteUrl;
      localStorage.setItem('currentUser', JSON.stringify(current));

      await this.showToast('✅ Foto de perfil actualizada', 'success');
    } catch (e) {
      console.error(e);
      await this.showToast('Error subiendo la imagen', 'danger');
    } finally {
      ev.target.value = '';
    }
  }

  async removeAvatar() {
    try {
      const current = this.apiService.getCurrentUser();
      await this.apiService.updateUserAvatar(current.id, { avatarId: null, avatarUrl: null }).toPromise();

      // Volver al default
      this.user.avatarUrl = this.defaultAvatar;
      current.avatarUrl = this.defaultAvatar;
      current.avatar = this.defaultAvatar;
      localStorage.setItem('currentUser', JSON.stringify(current));

      await this.showToast('Avatar quitado', 'success');
    } catch (e) {
      console.error(e);
      await this.showToast('No se pudo quitar el avatar', 'danger');
    }
  }

}
