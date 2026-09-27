import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DHAMEN_API } from '../../core/api/dhamen-api';
import { getRuntimeConfig } from '../../core/config/runtime-config';
import { ApiHealthService } from '../../core/config/api-health.service';
import { DashboardStats, DemoActivityEntry } from '../../core/models/dhamen.models';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { SarPipe } from '../../shared/pipes/sar.pipe';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHeader, Button, RouterLink, ProgressSpinner, StatusBadge, SarPipe, DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit {
  private readonly api = inject(DHAMEN_API);
  private readonly messages = inject(MessageService);
  readonly health = inject(ApiHealthService);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly activity = signal<DemoActivityEntry[]>([]);
  readonly authorityBalance = signal<number | null>(null);

  ngOnInit(): void {
    this.health.check();
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const authorityId = getRuntimeConfig().authorityProfileId;

    forkJoin({
      stats: this.api.getDashboardStats().pipe(
        catchError(() =>
          forkJoin({
            customers: this.api.listCustomers({ page: 1, pageSize: 1 }),
            suppliers: this.api.listSuppliers({ page: 1, pageSize: 1 }),
            contracts: this.api.listContracts({ page: 1, pageSize: 1 }),
            releases: this.api.listReleaseRequests({ page: 1, pageSize: 1 }),
            links: this.api.listPaymentLinks({ page: 1, pageSize: 1 }),
            payments: this.api.listPayments(),
          }).pipe(
            catchError(() =>
              of({
                customers: { totalCount: 0, items: [] },
                suppliers: { totalCount: 0, items: [] },
                contracts: { totalCount: 0, items: [] },
                releases: { totalCount: 0, items: [] },
                links: { totalCount: 0, items: [] },
                payments: [],
              })
            )
          )
        )
      ),
      activity: this.api.listActivity().pipe(catchError(() => of([]))),
      authority: authorityId
        ? this.api.getAuthorityBalance(authorityId).pipe(catchError(() => of(null)))
        : of(null),
      customers: this.api.listCustomers({ page: 1, pageSize: 200 }).pipe(
        catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 200 }))
      ),
      suppliers: this.api.listSuppliers({ page: 1, pageSize: 200 }).pipe(
        catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 200 }))
      ),
      contracts: this.api.listContracts({ page: 1, pageSize: 1 }).pipe(
        catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 1 }))
      ),
      releases: this.api.listReleaseRequests({ page: 1, pageSize: 1 }).pipe(
        catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 1 }))
      ),
      links: this.api.listPaymentLinks({ page: 1, pageSize: 1 }).pipe(
        catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 1 }))
      ),
      payments: this.api.listPayments().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (result) => {
        const base =
          result.stats && 'customersCount' in result.stats
            ? (result.stats as DashboardStats)
            : null;

        const customersBalanceTotal = result.customers.items.reduce((s, c) => s + c.balance, 0);
        const suppliersBalanceTotal = result.suppliers.items.reduce((s, c) => s + c.balance, 0);

        this.stats.set({
          customersCount: base?.customersCount ?? result.customers.totalCount,
          suppliersCount: base?.suppliersCount ?? result.suppliers.totalCount,
          customersBalanceTotal: base?.customersBalanceTotal ?? customersBalanceTotal,
          suppliersBalanceTotal: base?.suppliersBalanceTotal ?? suppliersBalanceTotal,
          paymentsCount: base?.paymentsCount ?? result.payments.length,
          contractsCount: base?.contractsCount ?? result.contracts.totalCount,
          releaseRequestsCount: base?.releaseRequestsCount ?? result.releases.totalCount,
          paymentLinksCount: base?.paymentLinksCount ?? result.links.totalCount,
          latestPayment: base?.latestPayment ?? result.payments[0] ?? null,
        });
        this.activity.set(result.activity.slice(0, 8));
        this.authorityBalance.set(result.authority?.balance ?? null);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }
}
