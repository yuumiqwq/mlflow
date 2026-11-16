import { CursorPagination as DesignSystemCursorPagination } from '@databricks/design-system';
import type { CursorPaginationProps } from '@databricks/design-system';
import { useIntl } from '@databricks/i18n';

export const CursorPagination = (props: CursorPaginationProps) => {
  const intl = useIntl();
  return (
    <DesignSystemCursorPagination
      {...props}
      previousPageText={
        props.previousPageText ??
        intl.formatMessage({ defaultMessage: 'Previous', description: 'Pagination previous page' })
      }
      nextPageText={
        props.nextPageText ?? intl.formatMessage({ defaultMessage: 'Next', description: 'Pagination next page' })
      }
      pageSizeSelect={
        props.pageSizeSelect && {
          ...props.pageSizeSelect,
          getOptionText:
            props.pageSizeSelect.getOptionText ??
            ((count) =>
              intl.formatMessage(
                { defaultMessage: '{count} / page', description: 'Pagination page size option' },
                { count },
              )),
          ariaLabel:
            props.pageSizeSelect.ariaLabel ??
            intl.formatMessage({ defaultMessage: 'Select page size', description: 'Pagination page size control' }),
        }
      }
    />
  );
};
