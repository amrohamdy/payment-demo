import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Tag } from 'primeng/tag';
import {
  getRuntimeConfig,
  saveRuntimeConfig,
} from '../../core/config/runtime-config';
import { ApiHealthService } from '../../core/config/api-health.service';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-settings-page',
  imports: [PageHeader, Button, ReactiveFormsModule, InputText, Tag],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  readonly health = inject(ApiHealthService);

  readonly saved = signal(false);

  readonly form = this.fb.nonNullable.group({
    baseUrl: ['', Validators.required],
    authorityProfileId: [''],
  });

  ngOnInit(): void {
    const config = getRuntimeConfig();
    this.form.reset({
      baseUrl: config.baseUrl,
      authorityProfileId: config.authorityProfileId ?? '',
    });
    this.health.check();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    saveRuntimeConfig({
      baseUrl: value.baseUrl.trim().replace(/\/$/, ''),
      authorityProfileId: value.authorityProfileId.trim() || null,
    });
    this.saved.set(true);
    this.messages.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'API settings saved. Reloading…',
    });
    setTimeout(() => location.reload(), 700);
  }

  recheck(): void {
    this.health.check();
  }
}
