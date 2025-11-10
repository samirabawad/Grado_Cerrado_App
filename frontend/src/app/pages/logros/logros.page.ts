import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api.service';

interface Achievement {
  id: string;
  title: string;
  description: string;
  daysRequired: number;
  icon: string;
  unlocked: boolean;
  color: string;
}

@Component({
  selector: 'app-logros',
  templateUrl: './logros.page.html',
  styleUrls: ['./logros.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, BottomNavComponent]
})
export class LogrosPage implements OnInit {

  currentStreak: number = 0;
  totalTests: number = 0;
  isLoading: boolean = true;

  // Secciones expandibles
  expandedSections: { [key: string]: boolean } = {
    racha: false,
    tests: false
  };

  achievements: Achievement[] = [
    { id: '1day', title: 'Primer Día', description: '1 día de racha', daysRequired: 1, icon: 'star', unlocked: false, color: '#10b981' },
    { id: '3days', title: 'Comenzando Fuerte', description: '3 días consecutivos', daysRequired: 3, icon: 'flame', unlocked: false, color: '#059669' },
    { id: '5days', title: 'Perseverante', description: '5 días de estudio', daysRequired: 5, icon: 'trophy', unlocked: false, color: '#047857' },
    { id: '7days', title: 'Una Semana', description: '7 días sin parar', daysRequired: 7, icon: 'ribbon', unlocked: false, color: '#065f46' },
    { id: '10days', title: 'Imparable', description: '10 días de racha', daysRequired: 10, icon: 'rocket', unlocked: false, color: '#064e3b' },
    { id: '15days', title: 'Dedicado', description: '15 días consecutivos', daysRequired: 15, icon: 'medal', unlocked: false, color: '#fbbf24' },
    { id: '21days', title: 'Hábito Formado', description: '21 días de constancia', daysRequired: 21, icon: 'checkmark-circle', unlocked: false, color: '#f59e0b' },
    { id: '30days', title: 'Un Mes Completo', description: '30 días sin fallar', daysRequired: 30, icon: 'star-half', unlocked: false, color: '#d97706' },
    { id: '60days', title: 'Maestro', description: '60 días de dedicación', daysRequired: 60, icon: 'school', unlocked: false, color: '#b45309' },
    { id: '100days', title: 'Leyenda', description: '100 días de racha', daysRequired: 100, icon: 'diamond', unlocked: false, color: '#92400e' }
  ];

  testAchievements: Achievement[] = [
    { id: 'principiante', title: 'Principiante', description: 'Completa 50 tests', daysRequired: 50, icon: 'ribbon', unlocked: false, color: '#10b981' },
    { id: 'aprendiz', title: 'Aprendiz', description: 'Completa 100 tests', daysRequired: 100, icon: 'school', unlocked: false, color: '#059669' },
    { id: 'estudiante', title: 'Estudiante', description: 'Completa 150 tests', daysRequired: 150, icon: 'book', unlocked: false, color: '#047857' },
    { id: 'dedicado', title: 'Dedicado', description: 'Completa 200 tests', daysRequired: 200, icon: 'heart', unlocked: false, color: '#065f46' },
    { id: 'perseverante', title: 'Perseverante', description: 'Completa 250 tests', daysRequired: 250, icon: 'fitness', unlocked: false, color: '#064e3b' },
    { id: 'comprometido', title: 'Comprometido', description: 'Completa 300 tests', daysRequired: 300, icon: 'medal', unlocked: false, color: '#fbbf24' },
    { id: 'avanzado', title: 'Avanzado', description: 'Completa 350 tests', daysRequired: 350, icon: 'trending-up', unlocked: false, color: '#f59e0b' },
    { id: 'experto', title: 'Experto', description: 'Completa 400 tests', daysRequired: 400, icon: 'star', unlocked: false, color: '#d97706' },
    { id: 'maestro', title: 'Maestro', description: 'Completa 450 tests', daysRequired: 450, icon: 'trophy', unlocked: false, color: '#b45309' },
    { id: 'sabio', title: 'Sabio', description: 'Completa 500 tests', daysRequired: 500, icon: 'diamond', unlocked: false, color: '#92400e' },
    { id: 'erudito', title: 'Erudito', description: 'Completa 550 tests', daysRequired: 550, icon: 'bulb', unlocked: false, color: '#7c2d12' },
    { id: 'virtuoso', title: 'Virtuoso', description: 'Completa 600 tests', daysRequired: 600, icon: 'musical-notes', unlocked: false, color: '#78350f' },
    { id: 'prodigio', title: 'Prodigio', description: 'Completa 650 tests', daysRequired: 650, icon: 'sparkles', unlocked: false, color: '#10b981' },
    { id: 'genio', title: 'Genio', description: 'Completa 700 tests', daysRequired: 700, icon: 'flash', unlocked: false, color: '#059669' },
    { id: 'leyenda', title: 'Leyenda', description: 'Completa 750 tests', daysRequired: 750, icon: 'rocket', unlocked: false, color: '#047857' },
    { id: 'titan', title: 'Titán', description: 'Completa 800 tests', daysRequired: 800, icon: 'shield', unlocked: false, color: '#065f46' },
    { id: 'campeon', title: 'Campeón', description: 'Completa 850 tests', daysRequired: 850, icon: 'flag', unlocked: false, color: '#064e3b' },
    { id: 'heroe', title: 'Héroe', description: 'Completa 900 tests', daysRequired: 900, icon: 'star-half', unlocked: false, color: '#fbbf24' },
    { id: 'inmortal', title: 'Inmortal', description: 'Completa 950 tests', daysRequired: 950, icon: 'infinite', unlocked: false, color: '#f59e0b' },
    { id: 'supremo', title: 'Supremo', description: 'Completa 1000 tests', daysRequired: 1000, icon: 'diamond', unlocked: false, color: '#d97706' },
    { id: 'trascendental', title: 'Trascendental', description: 'Completa 1050 tests', daysRequired: 1050, icon: 'prism', unlocked: false, color: '#b45309' },
    { id: 'divino', title: 'Divino', description: 'Completa 1100 tests', daysRequired: 1100, icon: 'sunny', unlocked: false, color: '#92400e' },
    { id: 'omnisciente', title: 'Omnisciente', description: 'Completa 1150 tests', daysRequired: 1150, icon: 'eye', unlocked: false, color: '#7c2d12' },
    { id: 'absoluto', title: 'Absoluto', description: 'Completa 1200 tests', daysRequired: 1200, icon: 'nuclear', unlocked: false, color: '#78350f' },
    { id: 'infinito', title: 'Infinito', description: 'Completa 1250 tests', daysRequired: 1250, icon: 'infinite', unlocked: false, color: '#10b981' },
    { id: 'eterno', title: 'Eterno', description: 'Completa 1300 tests', daysRequired: 1300, icon: 'time', unlocked: false, color: '#059669' },
    { id: 'celestial', title: 'Celestial', description: 'Completa 1350 tests', daysRequired: 1350, icon: 'planet', unlocked: false, color: '#047857' },
    { id: 'ilimitado', title: 'Ilimitado', description: 'Completa 1400 tests', daysRequired: 1400, icon: 'expand', unlocked: false, color: '#065f46' },
    { id: 'perfecto', title: 'Perfecto', description: 'Completa 1450 tests', daysRequired: 1450, icon: 'checkmark-circle', unlocked: false, color: '#064e3b' },
    { id: 'definitivo', title: 'Definitivo', description: 'Completa 1500 tests', daysRequired: 1500, icon: 'star', unlocked: false, color: '#fbbf24' }
  ];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadAchievements();
  }

  async loadAchievements() {
    this.isLoading = true;

    try {
      const currentUser = this.apiService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        console.warn('No hay usuario logueado');
        this.isLoading = false;
        return;
      }

      const studentId = currentUser.id;
      console.log('Cargando logros para estudiante:', studentId);

      try {
        const statsResponse = await this.apiService.getDashboardStats(studentId).toPromise();

        if (statsResponse && statsResponse.success) {
          const stats = statsResponse.data;
          this.currentStreak = stats.streak || 0;
          this.totalTests = stats.totalTests || 0;

          this.unlockAchievements(this.currentStreak);
          this.unlockTestAchievements(this.totalTests);

          console.log('Logros cargados. Racha:', this.currentStreak, 'Tests:', this.totalTests);
        }
      } catch (error) {
        console.error('Error cargando logros:', error);
      }

    } catch (error) {
      console.error('Error general en loadAchievements:', error);
    } finally {
      this.isLoading = false;
    }
  }

  unlockAchievements(streak: number) {
    this.achievements.forEach(a => {
      a.unlocked = streak >= a.daysRequired;
    });
  }

  unlockTestAchievements(totalTests: number) {
    this.testAchievements.forEach(a => {
      a.unlocked = totalTests >= a.daysRequired;
    });
  }

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}
