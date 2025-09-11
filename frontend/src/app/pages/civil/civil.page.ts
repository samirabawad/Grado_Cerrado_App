import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-civil',
  templateUrl: './civil.page.html',
  styleUrls: ['./civil.page.scss'],
  standalone: false  // ← Agrega esta línea
})
export class CivilPage implements OnInit {
  constructor() { }
  ngOnInit() { }
}