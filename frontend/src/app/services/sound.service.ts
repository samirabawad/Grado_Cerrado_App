import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;

  constructor() {
    this.loadSounds();
  }

  private loadSounds() {
    this.sounds['correct'] = new Audio('assets/sounds/correct.mp3');
    this.sounds['incorrect'] = new Audio('assets/sounds/incorrect.mp3');
    
    Object.values(this.sounds).forEach(sound => {
      sound.volume = 0.6;
    });
  }

  play(soundName: 'correct' | 'incorrect') {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.warn('Error reproduciendo sonido:', error);
      });
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}