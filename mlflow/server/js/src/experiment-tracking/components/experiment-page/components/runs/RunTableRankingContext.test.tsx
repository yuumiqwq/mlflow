import { describe, expect, jest, test } from '@jest/globals';
import { MlflowService } from '../../../../sdk/MlflowService';
import { fetchRankingRuns } from './RunTableRankingContext';
import type { RunEntity } from '../../../../types';

jest.mock('../../../../sdk/MlflowService', () => ({ MlflowService: { searchRuns: jest.fn() } }));

describe('unfiltered ranking snapshot', () => {
  test('fetches every page without search, status, model or visibility filters', async () => {
    const search = jest.mocked(MlflowService.searchRuns);
    search.mockResolvedValueOnce({ runs: [{ info: { runUuid: 'a' } } as RunEntity], next_page_token: 'next' });
    search.mockResolvedValueOnce({ runs: [{ info: { runUuid: 'b' } } as RunEntity] });
    expect((await fetchRankingRuns(['4'])).map((r) => r.info.runUuid)).toEqual(['a', 'b']);
    expect(search).toHaveBeenNthCalledWith(1, {
      experiment_ids: ['4'],
      run_view_type: 'ACTIVE_ONLY',
      filter: '',
      max_results: 1000,
      page_token: undefined,
    });
    expect(search).toHaveBeenNthCalledWith(2, expect.objectContaining({ filter: '', page_token: 'next' }));
  });
});
