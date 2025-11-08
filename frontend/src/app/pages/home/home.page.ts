import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class HomePage implements OnInit {


  defaultAvatar = 'assets/avatars/racoon1.svg';
  userAvatarUrl = this.defaultAvatar;

  userName: string = 'Estudiante';
  userCoins: number = 0;
  
  userStreak: number = 0;
  totalSessions: number = 0;
  totalQuestions: number = 0;
  overallSuccessRate: number = 0;
  
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    this.loadUserData();
    this.loadUserAvatar();

  }

  private loadUserAvatar() {
    // ⬇️ usar apiService (no existe this.api)
    const current = this.apiService.getCurrentUser();
    const raw = current?.avatarUrl || current?.avatar || '';
    const resolved = this.buildAvatarUrl(raw);
    this.userAvatarUrl = resolved || this.defaultAvatar;
  }


  // Convierte '/avatars/...' a 'http://host:puerto/avatars/...'
  private buildAvatarUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/avatars/')) {
      const filesBase = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${filesBase}${url}`;
    }
    return url;
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }


  ionViewWillEnter() {
    this.loadUserData();
  }

  async loadUserData() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();
      
      if (!currentUser || !currentUser.id) {
        console.warn('⚠️ No hay usuario logueado');
        this.userName = 'Estudiante';
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;

      // Usar el nombre del usuario almacenado en localStorage
      this.userName = currentUser.name || 'Estudiante';
      
      console.log('📊 Cargando estadísticas para:', studentId, this.userName);

      // Cargar estadísticas del dashboard
      try {
        const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();
        if (statsResponse && statsResponse.success) {
          const stats = statsResponse.data;
          this.totalSessions = stats.totalTests || 0;
          this.totalQuestions = stats.totalQuestions || 0;
          this.overallSuccessRate = Math.round(stats.successRate || 0);
          this.userStreak = stats.streak || 0;
          
          console.log('✅ Estadísticas cargadas:', {
            sesiones: this.totalSessions,
            preguntas: this.totalQuestions,
            tasa: this.overallSuccessRate,
            racha: this.userStreak
          });
        } else {
          console.warn('⚠️ No se pudieron cargar estadísticas');
        }
      } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
        // Mantener valores por defecto (0)
      }

    } catch (error) {
      console.error('❌ Error general en loadUserData:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getFirstName(): string {
    if (!this.userName) return 'Estudiante';
    return this.userName.split(' ')[0];
  }

  getProgressMessage(): string {
    if (this.totalSessions === 0) {
      return '¡Comienza tu primera sesión!';
    } else if (this.totalSessions < 5) {
      return `${this.totalSessions} ${this.totalSessions === 1 ? 'sesión completada' : 'sesiones completadas'}`;
    } else {
      return `${this.totalSessions} sesiones - ${this.totalQuestions} preguntas`;
    }
  }

  getProgressSubtitle(): string {
    const sessions = this.totalSessions ?? 0;
    const streak = this.userStreak ?? 0;

    if (sessions <= 0) {
      return 'Aún no registras progreso. ¡Empieza tu primera sesión!';
    }
    if (streak <= 0) {
      return 'Retoma tu racha hoy.';
    }
    if (streak === 1) {
      return '¡Llevas 1 día seguido!';
    }
    return `¡Llevas ${streak} días seguidos!`;
  }

  getProgressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    const goal = 200;
    return Math.min((this.totalQuestions / goal) * 100, 100);
  }

  goToCivil() {
    this.router.navigate(['/civil']);
  }

  goToProcesal() {
    this.router.navigate(['/procesal']);
  }

  goToRacha() {
    this.router.navigate(['/racha']);
  }

  goToFullHistory() {
    this.router.navigate(['/historial']);
  }

  navigateToCivil() {
    this.router.navigate(['/civil']);
  }

  navigateToProcesal() {
    this.router.navigate(['/procesal']);
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  navigateToRacha() {
    this.router.navigate(['/racha']);
  }

  navigateToLogros() {
    this.router.navigate(['/logros']);
  }

  navigateToHistorial() {
    this.router.navigate(['/historial']);
  }
}