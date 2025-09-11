import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-civil-escrito',
  templateUrl: './civil-escrito.page.html',
  styleUrls: ['./civil-escrito.page.scss'],
  standalone: false  // ← Agrega esta línea
})
export class CivilEscritoPage implements OnInit {
  constructor(private router: Router) { }
  ngOnInit() { }

  goToQuickPractice() {
    this.router.navigate(['/civil/civil-escrito/practica-rapida']);
  }

  goToStandardSession() {
    console.log('Ir a sesión estándar');
  }

  goToConfiguration() {
    this.router.navigate(['/civil/civil-escrito/configuracion']);
  }
}