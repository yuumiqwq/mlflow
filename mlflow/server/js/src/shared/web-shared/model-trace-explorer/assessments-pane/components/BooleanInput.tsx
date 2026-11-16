import { sourceIntl } from '../../../../../i18n/SourceMessages';
import { SegmentedControlButton, SegmentedControlGroup } from '@databricks/design-system';

import type { AssessmentValueInputFieldProps } from './types';

export const BooleanInput = ({
  value,
  valueError,
  setValue,
  setValueError,
  isSubmitting,
}: AssessmentValueInputFieldProps) => {
  return (
    <div>
      <SegmentedControlGroup
        data-testid="assessment-value-boolean-input"
        componentId="shared.model-trace-explorer.assessment-value-boolean-input"
        name="shared.model-trace-explorer.assessment-value-boolean-input"
        value={value}
        disabled={isSubmitting}
        onChange={(e) => {
          setValue(e.target.value);
          setValueError(null);
        }}
      >
        <SegmentedControlButton value>
          {sourceIntl.formatMessage({ defaultMessage: 'True', description: 'Legacy UI label' })}
        </SegmentedControlButton>
        <SegmentedControlButton value={false}>
          {sourceIntl.formatMessage({ defaultMessage: 'False', description: 'Legacy UI label' })}
        </SegmentedControlButton>
      </SegmentedControlGroup>
      {valueError && <div css={{ marginTop: '8px', color: 'red' }}>{valueError}</div>}
    </div>
  );
};
