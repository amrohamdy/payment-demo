import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  host: {
    dir: 'rtl',
  },
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      direction: rtl;
    }
  `,
})
export class App {}
