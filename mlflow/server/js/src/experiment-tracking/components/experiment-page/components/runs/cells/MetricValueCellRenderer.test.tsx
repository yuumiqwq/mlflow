import { describe, expect, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { DesignSystemProvider } from '@databricks/design-system';
import { combineReducers, createStore } from 'redux';
import { colorByRunUuid, RUN_COLOR_ACTION_SET_RUN_COLOR } from '../../../../../reducers/RunColorReducer';
import type { RunRowType } from '../../../utils/experimentPage.row-types';
import { formatRunTableMetric, MetricValueCellRenderer } from './MetricValueCellRenderer';

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

  test('uses the live run color and exposes full precision on hover and keyboard focus', async () => {
    const store = createStore(combineReducers({ entities: combineReducers({ colorByRunUuid }) }));
    store.dispatch({ type: RUN_COLOR_ACTION_SET_RUN_COLOR, runOrGroupUuid: 'run-1', colorValue: '#123456' });
    const value = 0.939086123;
    render(
      <DesignSystemProvider>
        <Provider store={store}>
          <MetricValueCellRenderer value={value} metricKey="best_OA" data={{ runUuid: 'run-1' } as RunRowType} />
        </Provider>
      </DesignSystemProvider>,
    );
    const cell = screen.getByText('0.939');
    expect(cell).toHaveStyle({ color: '#123456' });
    await userEvent.hover(cell);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(String(value));
    await userEvent.unhover(cell);
    await userEvent.tab();
    expect(cell).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(String(value));
    act(() => {
      store.dispatch({ type: RUN_COLOR_ACTION_SET_RUN_COLOR, runOrGroupUuid: 'run-1', colorValue: '#654321' });
    });
    expect(cell).toHaveStyle({ color: '#654321' });
  });
});
