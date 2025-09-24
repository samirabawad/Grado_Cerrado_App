import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class BottomNavComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {}

  // Verificar si la ruta actual está activa
  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  // Navegación
  goToHome() {
    this.router.navigate(['/home']);
  }

  goToStats() {
    console.log('Ir a estadísticas');
    // this.router.navigate(['/stats']);
  }

  openAddMenu() {
    console.log('Abrir menú de agregar');
    // Aquí puedes abrir un modal o menú
  }

  goToNotifications() {
    console.log('Ir a notificaciones');
    // this.router.navigate(['/notifications']);
  }

  goToProfile() {
    console.log('Ir a perfil');
    // this.router.navigate(['/profile']);
  }
}