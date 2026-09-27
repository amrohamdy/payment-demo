import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { Sidebar } from '../sidebar/sidebar';
import { ApiHealthService } from '../../../core/config/api-health.service';
import { getRuntimeConfig } from '../../../core/config/runtime-config';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private readonly health = inject(ApiHealthService);
  readonly apiMode = getRuntimeConfig().apiMode;

  ngOnInit(): void {
    this.health.check();
  }
}