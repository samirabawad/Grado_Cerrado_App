// frontend/src/app/pages/profile/profile.page.ts

import { Component, OnInit } from '@angular/core';
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
export class ProfilePage implements OnInit {

  // ============================================
  // PROPIEDADES EXISTENTES
  // ============================================
  user = {
    id: 2, // IMPORTANTE: Cambiar al ID real del usuario logueado
    nombre: 'Usuario',
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
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadSettings();
    this.loadStudyFrequency();
    this.loadCumplimiento();
  }

  // ============================================
  // MÉTODOS EXISTENTES
  // ============================================
  loadUserData() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const parsed = JSON.parse(userData);
      this.user.id = parsed.id || 2;
      const fullName = parsed.name || 'Usuario';
      this.user.nombre = fullName.split(' ')[0];
      this.user.email = parsed.email || 'usuario@example.com';
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

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
  // MÉTODOS DE FRECUENCIA DE ESTUDIO
  // ============================================
  
  loadStudyFrequency() {
    const studentId = this.user.id;
    
    this.apiService.getStudyFrequency(studentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.frecuenciaConfig = {
            frecuenciaSemanal: response.data.frecuenciaSemanal || 3,
            objetivoDias: (response.data.objetivoDias as 'flexible' | 'estricto' | 'personalizado') || 'flexible',
            diasPreferidos: response.data.diasPreferidos || [],
            recordatorioActivo: response.data.recordatorioActivo ?? true,
            horaRecordatorio: response.data.horaRecordatorio || '19:00'
          };
          console.log('✅ Configuración cargada:', this.frecuenciaConfig);
        }
      },
      error: (error) => {
        console.error('Error cargando frecuencia:', error);
      }
    });
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

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================
  
  async saveFrequency() {
    this.isSaving = true;

    this.apiService.updateStudyFrequency(this.user.id, this.frecuenciaConfig).subscribe({
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