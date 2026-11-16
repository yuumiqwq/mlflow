import { sourceIntl } from '../../i18n/SourceMessages';
import React, { Component } from 'react';

class NotFoundPage extends Component {
  render() {
    return (
      <div>{sourceIntl.formatMessage({ defaultMessage: 'Resource not found.', description: 'Legacy UI label' })}</div>
    );
  }
}

export default NotFoundPage;
