import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, expect, test } from 'vitest';
import { ThemeToggle } from '../components/theme-toggle';
import { OnboardingTour } from '../components/onboarding-tour';
import { WalletCard } from '../components/wallet-card';
import { LanguageProvider } from '../lib/i18n';
import type { AssetBalance } from '../features/dashboard/models';

expect.extend(toHaveNoViolations);

afterEach(() => {
  localStorage.clear();
  cleanup();
});

test('ThemeToggle should have no accessibility violations', async () => {
  const { container } = render(<ThemeToggle />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('OnboardingTour should have no accessibility violations', async () => {
  render(<OnboardingTour />);
  await waitFor(() => screen.getByRole('dialog'));

  // The tour renders in a portal, so the dialog lives outside the container
  // returned by `render`. Scanning the document body covers the whole tree.
  // `region` is switched off because the portal is a sibling of the app's
  // landmarks by construction; every other rule still applies.
  const results = await axe(document.body, {
    rules: { region: { enabled: false } },
  });
  expect(results).toHaveNoViolations();
});

test('WalletCard should have no accessibility violations', async () => {
  const asset: AssetBalance = {
    code: 'XLM',
    issuer: 'native',
    balance: 5234.5,
    value: 1046.9,
    change24h: 1.24,
    history: [0.19, 0.2, 0.198, 0.205, 0.21, 0.208, 0.212],
  };

  const { container } = render(
    <LanguageProvider>
      <WalletCard asset={asset} />
    </LanguageProvider>
  );

  const balance = screen.getByText('5234.5000');
  expect(balance).toHaveAttribute('aria-live', 'polite');
  expect(balance).toHaveAttribute('aria-atomic', 'true');

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

