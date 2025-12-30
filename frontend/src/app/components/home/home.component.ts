import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import lottie, { AnimationItem } from 'lottie-web';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nutritionAnimation', { static: false }) nutritionAnimationContainer!: ElementRef;
  @ViewChild('treadmillHeroAnimation', { static: false }) treadmillHeroAnimationContainer!: ElementRef;
  @ViewChild('treadmillShowcaseAnimation', { static: false }) treadmillShowcaseAnimationContainer!: ElementRef;
  
  private nutritionAnimation: AnimationItem | null = null;
  private treadmillHeroAnimation: AnimationItem | null = null;
  private treadmillShowcaseAnimation: AnimationItem | null = null;

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Add a small delay to ensure DOM elements are ready
    setTimeout(() => {
      this.loadNutritionAnimation();
      this.loadTreadmillHeroAnimation();
      this.loadTreadmillShowcaseAnimation();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.nutritionAnimation) {
      this.nutritionAnimation.destroy();
    }
    if (this.treadmillHeroAnimation) {
      this.treadmillHeroAnimation.destroy();
    }
    if (this.treadmillShowcaseAnimation) {
      this.treadmillShowcaseAnimation.destroy();
    }
  }

  private loadNutritionAnimation(): void {
    if (this.nutritionAnimationContainer?.nativeElement) {
      this.nutritionAnimation = lottie.loadAnimation({
        container: this.nutritionAnimationContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/assets/animations/nutrition.json'
      });
    }
  }

  private loadTreadmillHeroAnimation(): void {
    if (this.treadmillHeroAnimationContainer?.nativeElement) {
      this.treadmillHeroAnimation = lottie.loadAnimation({
        container: this.treadmillHeroAnimationContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/assets/animations/RunningonTreadmill.json'
      });
    }
  }

  private loadTreadmillShowcaseAnimation(): void {
    if (this.treadmillShowcaseAnimationContainer?.nativeElement) {
      this.treadmillShowcaseAnimation = lottie.loadAnimation({
        container: this.treadmillShowcaseAnimationContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/assets/animations/RunningonTreadmill.json'
      });
    }
  }
}
