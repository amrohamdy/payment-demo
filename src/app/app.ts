import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  host: {
    dir: 'ltr',
  },
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      direction: ltr;
    }
  `,
})
export class App {}
