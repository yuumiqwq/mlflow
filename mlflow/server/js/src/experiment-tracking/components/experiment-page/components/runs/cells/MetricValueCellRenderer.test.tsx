import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignSystemProvider } from '@databricks/design-system';
import type { RunRowType } from '../../../utils/experimentPage.row-types';
import { formatRunTableMetric, MetricValueCellRenderer } from './MetricValueCellRenderer';
import { RunTableRankingContext } from '../RunTableRankingContext';

jest.mock('../../../hooks/useExperimentRunColor', () => ({ useGetExperimentRunColor: () => () => '#804080' }));

describe('run table metric presentation', () => {
  test.each([
    [0.939086123, '0.939'],
    ['0.939086123', '0.939'],
    [1, '1.000'],
    [0, '0.000'],
    [-0.1239, '-0.124'],
    [1e-12, '0.000'],
    [-1e-12, '-0.000'],
    [1e21, '1000000000000000000000.000'],
    [NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [-Infinity, '-Infinity'],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    [null, '-'],
    [undefined, '-'],
    ['-', '-'],
    ['', '-'],
  ])('formats %s without changing the supplied value', (value, expected) => {
    expect(formatRunTableMetric(value, 'best_OA')).toBe(expected);
  });

  test.each([
    'epoch',
    'train/epoch',
    'best_epoch',
    'step',
    'steps',
    'iterations',
    'sample-count',
    'sample_count',
    'samples',
    'num_samples',
    'n_samples',
  ])('keeps %s integer counters', (key) => {
    expect(formatRunTableMetric(42, key)).toBe('42');
  });

  test('uses neutral text, emphasizes only the winning metric and exposes precision on hover/focus', async () => {
    const value = 0.939086123;
    const { rerender } = render(
      <DesignSystemProvider>
        <RunTableRankingContext.Provider
          value={{ enabled: true, awards: { 'run-1': { tone: 'gold', metricWinners: { best_OA: value } } } }}
        >
          <MetricValueCellRenderer value={value} metricKey="best_OA" data={{ runUuid: 'run-1' } as RunRowType} />
        </RunTableRankingContext.Provider>
      </DesignSystemProvider>,
    );
    const cell = screen.getByText('0.939');
    expect(cell.style.color).toBe('');
    expect(cell).toHaveStyle({ fontWeight: 700 });
    await userEvent.hover(cell);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(String(value));
    await userEvent.unhover(cell);
    await userEvent.tab();
    expect(cell).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(String(value));
    rerender(
      <DesignSystemProvider>
        <MetricValueCellRenderer value={value} metricKey="best_OA" data={{ runUuid: 'run-1' } as RunRowType} />
      </DesignSystemProvider>,
    );
    expect(screen.getByText('0.939').style.fontWeight).toBe('');
    expect(screen.getByText('0.939').style.color).toBe('rgb(128, 64, 128)');
  });
});
