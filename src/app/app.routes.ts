import { Routes } from '@angular/router';
import { Shell } from './shared/layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers.page').then((m) => m.CustomersPage),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/suppliers.page').then((m) => m.SuppliersPage),
      },
      {
        path: 'escrow-accounts',
        loadComponent: () =>
          import('./features/escrow-accounts/escrow-accounts.page').then(
            (m) => m.EscrowAccountsPage
          ),
      },
      {
        path: 'contracts',
        loadComponent: () =>
          import('./features/contracts/contracts.page').then((m) => m.ContractsPage),
      },
      {
        path: 'release-requests',
        loadComponent: () =>
          import('./features/release-requests/release-requests.page').then(
            (m) => m.ReleaseRequestsPage
          ),
      },
      {
        path: 'payment-links',
        loadComponent: () =>
          import('./features/payment-links/payment-links.page').then((m) => m.PaymentLinksPage),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/payments/payments.page').then((m) => m.PaymentsPage),
      },
      {
        path: 'payouts-splits',
        loadComponent: () =>
          import('./features/payouts-splits/payouts-splits.page').then(
            (m) => m.PayoutsSplitsPage
          ),
      },
      {
        path: 'demo-wizard',
        loadComponent: () =>
          import('./features/demo-wizard/demo-wizard.page').then((m) => m.DemoWizardPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
