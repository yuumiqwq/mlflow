import { LegacySelect } from '@databricks/design-system';
import { useIntl } from '@databricks/i18n';

export const LanguageSelector = () => {
  const intl = useIntl();
  return (
    <LegacySelect
      aria-label={intl.formatMessage({ defaultMessage: 'Language', description: 'UI language selector' })}
      value={intl.locale.startsWith('zh') ? 'zh-CN' : 'en'}
      onChange={(locale: string) => {
        // Preserve the deployment prefix, workspace and deep link when changing language.
        const url = new URL(window.location.href);
        url.searchParams.set('l', String(locale));
        window.location.assign(url.href);
      }}
      css={{ minWidth: 130 }}
    >
      <LegacySelect.Option value="zh-CN">简体中文</LegacySelect.Option>
      <LegacySelect.Option value="en">English</LegacySelect.Option>
    </LegacySelect>
  );
};
