import { Global } from '@emotion/react';

// Token overrides cover the React components; these rules cover legacy AntD and grid CSS.
export const readableTypography = {
  fontSizeSm: 14,
  fontSizeBase: 16,
  fontSizeMd: 18,
  fontSizeLg: 20,
  fontSizeXl: 22,
  fontSizeXxl: 24,
  lineHeightSm: '22px',
  lineHeightBase: '24px',
  lineHeightMd: '26px',
  lineHeightLg: '28px',
  lineHeightXl: '30px',
  lineHeightXxl: '32px',
};

const fontFamily = 'Inter, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

export const ReadabilityStyles = () => (
  <Global
    styles={{
      'html, body': { fontFamily, fontSize: 16, lineHeight: 1.5, textSizeAdjust: '100%' },
      'body .mlflow-ui-container': { fontFamily, fontSize: 16, lineHeight: 1.5 },
      'body [class*="ant-"], body [class*="du-bois-"]': { fontFamily },
      'body .ant-btn, body .ant-input, body .ant-select, body .ant-dropdown-menu, body .ant-modal, body .ant-tooltip, body .ant-table':
        {
          fontSize: 15,
        },
      'body .ant-btn, body .ant-input, body .ant-select-selector': { minHeight: 36 },
      'body button[class], body [class*="-select-selector"], body [class*="-input"], body [role="menuitem"], body [role="option"]':
        {
          fontSize: '15px !important',
          lineHeight: '22px',
        },
      'body [class*="-breadcrumb"] a, body [class*="-breadcrumb"] span': { fontSize: '14px !important' },
      'body [role="tooltip"]': { fontSize: 14, lineHeight: '22px' },
      'body [class*="-tree-title"], body [class*="-tree-node-content-wrapper"], body [class*="-modal-body"], body [class*="-popover-inner-content"]': {
        fontSize: '15px !important', lineHeight: '24px',
      },
      'body [class*="du-bois-"][class$="-btn"], body [class*="du-bois-"][class$="-input"], body [class*="du-bois-"][class$="-select-selector"]':
        {
          minHeight: 36,
        },
      'body .ag-theme-balham': {
        '--ag-font-family': fontFamily,
        '--ag-font-size': '15px',
        fontSize: 15,
      },
      'body .ag-header-cell, body .ag-cell': { fontSize: 15 },
      'body [role="columnheader"], body [role="cell"], body td, body th': { fontSize: 15 },
      'body h1': { fontSize: 24, lineHeight: '32px' },
      'body h2': { fontSize: 22, lineHeight: '30px' },
      'body h3': { fontSize: 20, lineHeight: '28px' },
      'body h4': { fontSize: 18, lineHeight: '26px' },
      'body .ant-modal': { maxWidth: 'calc(100vw - 24px)' },
      'body .du-bois-light-modal, body .du-bois-dark-modal': { maxWidth: 'calc(100vw - 24px)' },
      '@media (max-width: 767px)': {
        'body [role="tablist"]': { flexWrap: 'wrap', height: 'auto', overflow: 'visible' },
        'body [role="tab"]': { fontSize: '15px !important' },
        'body .ant-modal-body': { padding: 16 },
        'body .ant-modal-footer': { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
        'body input, body textarea': { fontSize: 16 },
      },
    }}
  />
);
