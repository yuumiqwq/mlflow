import { describe, expect, test } from '@jest/globals';
import { createExperimentPageUIState } from '../models/ExperimentPageUIState';
import { initializeBestMetricColumns } from './bestMetricColumns';

describe('training metric column defaults', () => {
  test.each([
    [
      ['best_Macro_F1', 'loss', 'best_mAcc', 'best_OA'],
      ['best_OA', 'best_mAcc', 'best_Macro_F1'],
    ],
    [
      ['best_per_point_Acc', 'best_class_mIoU', 'best_instance_mIoU'],
      ['best_instance_mIoU', 'best_class_mIoU', 'best_per_point_Acc'],
    ],
    [
      ['best_z', 'best_b', 'best_a', 'best_c'],
      ['best_a', 'best_b', 'best_c'],
    ],
  ])('selects three scores in a deterministic order', (keys, expected) => {
    const state = initializeBestMetricColumns(createExperimentPageUIState(), keys);
    expect(state.selectedColumns).toEqual(expected.map((key) => 'metrics.`' + key + '`'));
    expect(state.columnOrder.slice(2, 5)).toEqual(state.selectedColumns);
    expect(state.bestMetricColumnsInitialized).toBe(true);
  });

  test('waits for asynchronously loaded best metrics and migrates only once', () => {
    const initial = createExperimentPageUIState();
    expect(initializeBestMetricColumns(initial, [])).toBe(initial);
    expect(initializeBestMetricColumns(initial, ['loss'])).toBe(initial);
    const migrated = initializeBestMetricColumns(initial, ['best_OA']);
    const manuallyRestored = { ...migrated, selectedColumns: initial.selectedColumns, columnOrder: [] };
    expect(initializeBestMetricColumns(manuallyRestored, ['best_OA'])).toBe(manuallyRestored);
  });

  test.each([
    { selectedColumns: [] },
    { selectedColumns: ['metrics.loss'] },
    { selectedColumns: [...createExperimentPageUIState().selectedColumns].reverse() },
    { columnOrder: ['duration', 'runDateAndNestInfo'] },
    { columnWidths: { duration: 140 } },
  ])('preserves deliberate selection, order and width preferences', (custom) => {
    const state = { ...createExperimentPageUIState(), ...custom };
    expect(initializeBestMetricColumns(state, ['best_OA'])).toEqual({ ...state, bestMetricColumnsInitialized: true });
  });
});
