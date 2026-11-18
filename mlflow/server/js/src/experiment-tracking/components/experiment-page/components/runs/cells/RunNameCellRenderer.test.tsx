import { describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { DesignSystemProvider } from '@databricks/design-system';
import { MemoryRouter } from '../../../../../../common/utils/RoutingUtils';
import { RunNameCellRenderer, type RunNameCellRendererProps } from './RunNameCellRenderer';
import { RunTableRankingContext } from '../RunTableRankingContext';

jest.mock('../../../hooks/useExperimentRunColor', () => ({
  useGetExperimentRunColor: () => () => '#804080',
  useSaveExperimentRunColor: () => jest.fn(),
}));

describe('ranked run names', () => {
  const props = {
    data: { runUuid: 'a', experimentId: '4', runName: 'PointNet', runDateAndNestInfo: { level: 0 } },
    onExpand: jest.fn(),
  } as unknown as RunNameCellRendererProps;
  test.each(['gold', undefined] as const)('colors %s text without dots and preserves the run link', (tone) => {
    const { container } = render(
      <DesignSystemProvider>
        <MemoryRouter>
          <RunTableRankingContext.Provider value={{ enabled: true, awards: { a: { tone, metricWinners: {} } } }}>
            <RunNameCellRenderer {...props} />
          </RunTableRankingContext.Provider>
        </MemoryRouter>
      </DesignSystemProvider>,
    );
    const link = screen.getByRole('link', { name: 'PointNet' });
    expect(link).toHaveAttribute('href', expect.stringContaining('/runs/a'));
    expect(link).toHaveAttribute('tabindex', '0');
    if (tone) {
      expect(link).toHaveAttribute('data-run-rank', tone);
      expect(link.style.color).toBe('rgb(152, 101, 0)');
    } else {
      expect(link).not.toHaveAttribute('data-run-rank');
      expect(link.style.color).toBe('rgb(22, 22, 22)');
      expect(link.style.fontWeight).toBe('');
    }
    expect(container.querySelector('[data-testid="experiment-view-table-run-color"]')).toBeNull();
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });
  test('keeps the chart color picker as a neutral icon in compare mode', () => {
    render(
      <DesignSystemProvider>
        <MemoryRouter>
          <RunTableRankingContext.Provider value={{ enabled: true, awards: {} }}>
            <RunNameCellRenderer {...props} isComparingRuns />
          </RunTableRankingContext.Provider>
        </MemoryRouter>
      </DesignSystemProvider>,
    );
    expect(screen.getByLabelText('图表颜色')).toHaveValue('#804080');
    expect(screen.queryByTestId('experiment-view-table-run-color')).toBeNull();
  });
  test('preserves the existing control outside machine learning', () => {
    render(
      <DesignSystemProvider>
        <MemoryRouter>
          <RunNameCellRenderer {...props} />
        </MemoryRouter>
      </DesignSystemProvider>,
    );
    expect(screen.getByTestId('experiment-view-table-run-color')).toBeInTheDocument();
  });
});
