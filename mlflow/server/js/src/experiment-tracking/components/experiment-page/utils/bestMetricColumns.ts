import { isEqual } from 'lodash';
import { ATTRIBUTE_COLUMN_LABELS, COLUMN_TYPES } from '../../../constants';
import type { ExperimentPageUIState } from '../models/ExperimentPageUIState';
import { getDefaultSelectedColumns } from '../models/ExperimentPageUIState';
import { makeCanonicalSortKey } from './experimentPage.common-utils';

const preferredMetrics = [
  'best_OA',
  'best_mAcc',
  'best_Macro_F1',
  'best_instance_mIoU',
  'best_class_mIoU',
  'best_per_point_Acc',
];

export const initializeBestMetricColumns = (state: ExperimentPageUIState, metricKeys: string[]) => {
  const available = metricKeys.filter((key) => key.startsWith('best_'));
  if (state.bestMetricColumnsInitialized || available.length === 0) {
    return state;
  }
  // An exact legacy layout is the only saved layout we can identify as a default.
  if (
    !isEqual(state.selectedColumns, getDefaultSelectedColumns()) ||
    state.columnOrder.length > 0 ||
    Object.keys(state.columnWidths).length > 0
  ) {
    return { ...state, bestMetricColumnsInitialized: true };
  }
  const selectedColumns = [
    ...new Set([...preferredMetrics.filter((key) => available.includes(key)), ...available.sort()]),
  ]
    .slice(0, 3)
    .map((key) => makeCanonicalSortKey(COLUMN_TYPES.METRICS, key));
  return {
    ...state,
    bestMetricColumnsInitialized: true,
    selectedColumns,
    columnOrder: [
      makeCanonicalSortKey(COLUMN_TYPES.ATTRIBUTES, ATTRIBUTE_COLUMN_LABELS.RUN_NAME),
      'runDateAndNestInfo',
      ...selectedColumns,
      'duration',
    ],
  };
};
