import { sourceIntl } from '../../../i18n/SourceMessages';
import type { Table } from '@tanstack/react-table';

import { ParagraphSkeleton, TableSkeletonRows, useDesignSystemTheme } from '@databricks/design-system';

import type { EvalTraceComparisonEntry } from './types';

export const GenAITracesTableBodySkeleton = ({
  className,
  table,
}: {
  className?: string;
  table?: Table<EvalTraceComparisonEntry>;
}) => {
  const { theme } = useDesignSystemTheme();
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.backgroundPrimary,
      }}
      className={className}
    >
      {table ? (
        <TableSkeletonRows
          label={sourceIntl.formatMessage({ defaultMessage: 'Loading...', description: 'Legacy UI label' })}
          numRows={3}
          table={table}
        />
      ) : (
        [...Array(10).keys()].map((i) => (
          <ParagraphSkeleton
            label={sourceIntl.formatMessage({ defaultMessage: 'Loading...', description: 'Legacy UI label' })}
            key={i}
            seed={`s-${i}`}
          />
        ))
      )}
    </div>
  );
};
