import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-welcome2',
  templateUrl: './welcome2.page.html',
  styleUrls: ['./welcome2.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class Welcome2Page implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  iniciarSesion() {
    // Navegar a la página de login cuando esté lista
    this.router.navigate(['/civil']); // Por ahora va a civil
  }

  registro() {
    // Navegar a la página de registro cuando esté lista  
    this.router.navigate(['/civil']); // Por ahora va a civil
  }

}