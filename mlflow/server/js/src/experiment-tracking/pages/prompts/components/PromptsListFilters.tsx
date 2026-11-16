import { sourceIntl } from '../../../../i18n/SourceMessages';
import { TableFilterInput, TableFilterLayout } from '@databricks/design-system';
import { ModelSearchInputHelpTooltip } from '../../../../model-registry/components/model-list/ModelListFilters';

export const PromptsListFilters = ({
  searchFilter,
  onSearchFilterChange,
  componentId,
}: {
  searchFilter: string;
  onSearchFilterChange: (searchFilter: string) => void;
  componentId: string;
}) => {
  return (
    <TableFilterLayout>
      <TableFilterInput
        placeholder={sourceIntl.formatMessage({
          defaultMessage: 'Search prompts by name',
          description: 'Legacy UI label',
        })}
        componentId={componentId}
        value={searchFilter}
        onChange={(e) => onSearchFilterChange(e.target.value)}
        suffix={<ModelSearchInputHelpTooltip exampleEntityName="my-prompt-name" />}
      />
    </TableFilterLayout>
  );
};
