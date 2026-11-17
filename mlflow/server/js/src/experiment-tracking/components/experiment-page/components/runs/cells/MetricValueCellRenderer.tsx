import { Tooltip } from '@databricks/design-system';
import { useGetExperimentRunColor } from '../../../hooks/useExperimentRunColor';
import type { RunRowType } from '../../../utils/experimentPage.row-types';
import { AggregateMetricValueCell } from './AggregateMetricValueCell';
import { useExperimentViewRunsTableHeaderContext } from '../ExperimentViewRunsTableHeaderContext';

const metricNumberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
  useGrouping: false,
});

export const formatRunTableMetric = (value: unknown, metricKey: string) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number)) {
    return String(value);
  }
  // Training counters are recorded as metrics too, but retain their integer presentation.
  const isCounter =
    /(?:^|[/_.-])(?:epochs?|steps?|iterations?|samples?|sample[_-]?count|num[_-]?samples|n[_-]?samples)$/i.test(
      metricKey,
    );
  if (Number.isInteger(number) && isCounter) {
    return String(value);
  }
  return metricNumberFormat.format(number);
};

export const MetricValueCellRenderer = ({
  value,
  data,
  metricKey,
}: {
  value: number | string | null | undefined;
  data?: RunRowType;
  metricKey: string;
}) => {
  const getRunColor = useGetExperimentRunColor();
  const { useGroupedValuesInCharts } = useExperimentViewRunsTableHeaderContext();
  const formatted = formatRunTableMetric(value, metricKey);
  const raw = value === null || value === undefined || value === '' ? '-' : String(value);
  const colorId = data?.groupParentInfo
    ? data.rowUuid
    : data?.runDateAndNestInfo?.belongsToGroup && useGroupedValuesInCharts
      ? undefined
      : data?.runUuid;
  return (
    <Tooltip componentId="mlflow.experiment_tracking.runs_table.metric_value" content={raw}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard focus reveals the full-precision tooltip. */}
      <span tabIndex={0} style={{ color: colorId && raw !== '-' ? getRunColor(colorId) : undefined }}>
        {data?.groupParentInfo ? (
          <AggregateMetricValueCell value={formatted} valueFormatted={formatted} data={data} />
        ) : (
          formatted
        )}
      </span>
    </Tooltip>
  );
};
