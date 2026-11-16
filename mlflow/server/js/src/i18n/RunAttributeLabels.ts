import { sourceIntl } from './SourceMessages';

// Attribute identifiers are persisted in views and sort expressions. Translate only display labels.
export function getRunAttributeLabel(label: string): string {
  switch (label) {
    case 'Created':
      return sourceIntl.formatMessage({ defaultMessage: 'Created', description: 'Run attribute label' });
    case 'Experiment Name':
      return sourceIntl.formatMessage({ defaultMessage: 'Experiment Name', description: 'Run attribute label' });
    case 'Duration':
      return sourceIntl.formatMessage({ defaultMessage: 'Duration', description: 'Run attribute label' });
    case 'User':
      return sourceIntl.formatMessage({ defaultMessage: 'User', description: 'Run attribute label' });
    case 'Run Name':
      return sourceIntl.formatMessage({ defaultMessage: 'Run Name', description: 'Run attribute label' });
    case 'Source':
      return sourceIntl.formatMessage({ defaultMessage: 'Source', description: 'Run attribute label' });
    case 'Version':
      return sourceIntl.formatMessage({ defaultMessage: 'Version', description: 'Run attribute label' });
    case 'Models':
      return sourceIntl.formatMessage({ defaultMessage: 'Models', description: 'Run attribute label' });
    case 'Dataset':
      return sourceIntl.formatMessage({ defaultMessage: 'Dataset', description: 'Run attribute label' });
    case 'Description':
      return sourceIntl.formatMessage({ defaultMessage: 'Description', description: 'Run attribute label' });
    default:
      return label;
  }
}
