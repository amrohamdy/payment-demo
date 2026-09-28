import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { Sidebar } from '../sidebar/sidebar';
import { ApiHealthService } from '../../../core/config/api-health.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private readonly health = inject(ApiHealthService);

  ngOnInit(): void {
    this.health.check();
  }
}
