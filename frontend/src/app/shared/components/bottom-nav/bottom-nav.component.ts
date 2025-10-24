import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class BottomNavComponent implements OnInit, OnDestroy {

  unreadCount: number = 0;
  private subscription?: Subscription;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.loadUnreadCount();
    
    // Solo actualizar cuando la navegación termine (no en cada evento)
    this.subscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadUnreadCount();
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadUnreadCount() {
    try {
      const currentUser = this.apiService.getCurrentUser();
      if (currentUser && currentUser.id) {
        const response = await this.apiService.getNotifications(currentUser.id).toPromise();
        
        if (response && response.success) {
          this.unreadCount = response.noLeidas || 0;
        } else {
          this.unreadCount = 0;
        }
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      this.unreadCount = 0;
    }
  }

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  goToStats() {
    this.router.navigate(['/dashboard']);
  }

  goToRacha() {
    this.router.navigate(['/racha']);
  }

  openAddMenu() {
    console.log('Abrir menú de agregar');
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

}