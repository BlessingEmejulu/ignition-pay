import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import { WalletCard } from '../components/wallet-card'
import { LanguageProvider } from '../lib/i18n'
import { MASKED_AMOUNT } from '../hooks/use-hide-balances'
import type { AssetBalance } from '../features/dashboard/models'

expect.extend(toHaveNoViolations)

afterEach(() => {
  cleanup()
})

describe('WalletCard Accessibility & Live Updates (#885)', () => {
  const baseAsset: AssetBalance = {
    code: 'XLM',
    issuer: 'native',
    balance: 100.5,
    value: 12.34,
    change24h: 2.5,
    history: [0.12, 0.122, 0.124],
  }

  function renderCard(asset: AssetBalance = baseAsset, hideAmounts = false) {
    return render(
      <LanguageProvider>
        <WalletCard asset={asset} hideAmounts={hideAmounts} />
      </LanguageProvider>,
    )
  }

  it('renders balance inside a polite, atomic live region', () => {
    renderCard()

    const balanceEl = screen.getByText('100.5000')
    expect(balanceEl).toBeInTheDocument()
    expect(balanceEl).toHaveAttribute('aria-live', 'polite')
    expect(balanceEl).toHaveAttribute('aria-atomic', 'true')
  })

  it('preserves existing semantic paragraph structure on the balance element', () => {
    renderCard()

    const balanceEl = screen.getByText('100.5000')
    expect(balanceEl.tagName.toLowerCase()).toBe('p')
    // Should not override with conflicting landmark or alert roles
    expect(balanceEl).not.toHaveAttribute('role', 'alert')
  })

  it('announces balance changes when balance updates after a transaction', () => {
    const { rerender } = renderCard(baseAsset)

    const initialBalanceEl = screen.getByText('100.5000')
    expect(initialBalanceEl).toHaveAttribute('aria-live', 'polite')
    expect(initialBalanceEl).toHaveAttribute('aria-atomic', 'true')

    // Simulate balance increase after receiving funds
    const updatedAsset: AssetBalance = {
      ...baseAsset,
      balance: 250.75,
      value: 30.85,
    }

    rerender(
      <LanguageProvider>
        <WalletCard asset={updatedAsset} hideAmounts={false} />
      </LanguageProvider>,
    )

    const updatedBalanceEl = screen.getByText('250.7500')
    expect(updatedBalanceEl).toBeInTheDocument()
    expect(updatedBalanceEl).toHaveAttribute('aria-live', 'polite')
    expect(updatedBalanceEl).toHaveAttribute('aria-atomic', 'true')
    expect(screen.queryByText('100.5000')).not.toBeInTheDocument()
  })

  it('announces balance changes when balance decreases after sending funds', () => {
    const { rerender } = renderCard(baseAsset)

    // Simulate balance reduction after a payment transaction
    const postSendAsset: AssetBalance = {
      ...baseAsset,
      balance: 40.25,
      value: 4.95,
    }

    rerender(
      <LanguageProvider>
        <WalletCard asset={postSendAsset} hideAmounts={false} />
      </LanguageProvider>,
    )

    const updatedBalanceEl = screen.getByText('40.2500')
    expect(updatedBalanceEl).toBeInTheDocument()
    expect(updatedBalanceEl).toHaveAttribute('aria-live', 'polite')
    expect(updatedBalanceEl).toHaveAttribute('aria-atomic', 'true')
  })

  it('does not mutate the balance live region text when only DEX value changes', () => {
    const { rerender } = renderCard(baseAsset)

    const balanceEl = screen.getByText('100.5000')
    expect(screen.getByText('$12.34')).toBeInTheDocument()

    // Price tick changes market value but wallet holding balance is unchanged
    const priceTickAsset: AssetBalance = {
      ...baseAsset,
      value: 13.5,
      change24h: 3.1,
    }

    rerender(
      <LanguageProvider>
        <WalletCard asset={priceTickAsset} hideAmounts={false} />
      </LanguageProvider>,
    )

    // Balance text remains 100.5000, preventing redundant balance announcements
    expect(balanceEl).toHaveTextContent('100.5000')
    expect(screen.getByText('$13.50')).toBeInTheDocument()
  })

  it('maintains the live region when privacy mode hides amounts', () => {
    const { rerender } = renderCard(baseAsset, false)

    expect(screen.getByText('100.5000')).toBeInTheDocument()

    rerender(
      <LanguageProvider>
        <WalletCard asset={baseAsset} hideAmounts={true} />
      </LanguageProvider>,
    )

    expect(screen.queryByText('100.5000')).not.toBeInTheDocument()
    const masked = screen.getAllByText(MASKED_AMOUNT)
    // Both balance and value are masked
    expect(masked.length).toBe(2)
    // The balance masked element retains polite live region
    const balanceMasked = masked.find((el) => el.getAttribute('aria-live') === 'polite')
    expect(balanceMasked).toBeDefined()
    expect(balanceMasked).toHaveAttribute('aria-atomic', 'true')
  })

  it('has no accessibility violations under axe', async () => {
    const { container } = renderCard()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
