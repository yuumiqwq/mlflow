import type { IntlShape, MessageDescriptor } from 'react-intl';
import { I18nUtils } from './I18nUtils';

let currentIntl: IntlShape | undefined;

// Legacy class components and grid renderers share the root's React Intl catalog.
// Call at render time so user data and persisted filter values remain untouched.
export const sourceIntl = {
  formatMessage(descriptor: MessageDescriptor, values?: Record<string, string | number>) {
    const params = I18nUtils.getIntlProviderParams();
    if (!currentIntl || currentIntl.locale !== params.locale || currentIntl.messages !== params.messages) {
      currentIntl = I18nUtils.createIntlWithLocale();
    }
    return currentIntl.formatMessage(descriptor, values);
  },
};
