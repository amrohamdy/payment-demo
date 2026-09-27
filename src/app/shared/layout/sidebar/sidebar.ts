import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [{ label: 'Dashboard', route: '/dashboard', icon: 'pi pi-th-large' }],
    },
    {
      title: 'PARTIES',
      items: [
        { label: 'Customers', route: '/customers', icon: 'pi pi-users' },
        { label: 'Suppliers', route: '/suppliers', icon: 'pi pi-building' },
      ],
    },
    {
      title: 'ESCROW & CONTRACTS',
      items: [
        { label: 'Escrow accounts', route: '/escrow-accounts', icon: 'pi pi-wallet' },
        { label: 'Contracts', route: '/contracts', icon: 'pi pi-file' },
        { label: 'Release requests', route: '/release-requests', icon: 'pi pi-send' },
      ],
    },
    {
      title: 'COLLECTIONS',
      items: [
        { label: 'Payment links', route: '/payment-links', icon: 'pi pi-link' },
        { label: 'Payments hub', route: '/payments', icon: 'pi pi-credit-card' },
      ],
    },
    {
      title: 'PAY-OUT',
      items: [{ label: 'Payouts & Splits', route: '/payouts-splits', icon: 'pi pi-share-alt' }],
    },
  ];
}
