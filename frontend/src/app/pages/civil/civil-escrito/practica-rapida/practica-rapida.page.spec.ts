import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PracticaRapidaPage } from './practica-rapida.page';

describe('PracticaRapidaPage', () => {
  let component: PracticaRapidaPage;
  let fixture: ComponentFixture<PracticaRapidaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PracticaRapidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
