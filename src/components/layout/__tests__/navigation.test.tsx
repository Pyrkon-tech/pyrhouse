import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SidebarNav from '../SidebarNav';
import { NAV_GROUPS, findAdminTab, getAdminTabs, getNavGroups, isNavItemActive } from '../navigation';

const labels = (role: string | null) => getNavGroups(role).flatMap((g) => g.items.map((i) => i.label));

describe('navigation (menu variant B)', () => {
  it('hides role-restricted entries from plain users', () => {
    expect(labels('user')).not.toContain('Sklep');
    expect(labels('user')).not.toContain('Grafik');
    expect(labels('moderator')).toEqual(expect.arrayContaining(['Sklep', 'Grafik']));
  });

  it('keeps the menu short (~11 entries for an admin)', () => {
    expect(labels('admin').length).toBeLessThanOrEqual(11);
  });

  it('gives each role the admin tabs its routes allow', () => {
    expect(getAdminTabs('user')).toEqual([]);
    expect(getAdminTabs('dispatcher').map((t) => t.label)).toEqual(['Kategorie', 'Pochodzenie']);
    expect(getAdminTabs('moderator').map((t) => t.label)).toEqual(['Kategorie', 'Pochodzenie', 'Użytkownicy']);
    expect(getAdminTabs('admin')).toHaveLength(5);
  });

  it('maps nested paths to their section', () => {
    expect(findAdminTab('/users/42')?.label).toBe('Użytkownicy');
    expect(findAdminTab('/usersx')).toBeUndefined();
    const transfers = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.path === '/transfers')!;
    expect(isNavItemActive(transfers, '/transfers/12')).toBe(true);
    expect(isNavItemActive(transfers, '/transfersx')).toBe(false);
  });
});

describe('SidebarNav', () => {
  const renderNav = (role: string, path = '/home', shop = 0) =>
    render(
      <MemoryRouter>
        <SidebarNav activeItem={path} showFullNav isMobile={false} userRole={role} badges={{ shop }} onItemClick={() => {}} />
      </MemoryRouter>,
    );

  it('shows the queue counter on Sklep and the Administracja entry for a moderator', () => {
    renderNav('moderator', '/home', 3);
    const shop = screen.getByRole('link', { name: /Sklep/ });
    expect(within(shop).getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Administracja/ })).toHaveAttribute('href', '/categories');
  });

  it('has no Administracja for a plain user', () => {
    renderNav('user');
    expect(screen.queryByRole('link', { name: /Administracja/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Nowe' })).toBeInTheDocument();
  });
});
