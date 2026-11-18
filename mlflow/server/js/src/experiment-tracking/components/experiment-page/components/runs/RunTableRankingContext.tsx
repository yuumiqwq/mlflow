import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@databricks/web-shared/query-client';
import { useWorkflowType, WorkflowType } from '../../../../../common/contexts/WorkflowTypeContext';
import { useActiveWorkspace } from '../../../../../workspaces/utils/WorkspaceUtils';
import { MlflowService } from '../../../../sdk/MlflowService';
import type { ExperimentEntity, RunEntity, SearchRunsApiResponse } from '../../../../types';
import { buildRunTableRanking, getRankableExperimentIds, type RunTableAward } from '../../utils/runTableRanking';

export const RunTableRankingContext = createContext<{
  enabled: boolean;
  awards: Record<string, RunTableAward>;
  rankedExperimentIds?: Set<string>;
}>({
  enabled: false,
  awards: {},
});
export const useRunTableRanking = (experimentId?: string) => {
  const context = useContext(RunTableRankingContext);
  return {
    ...context,
    enabled:
      context.enabled &&
      (!experimentId || !context.rankedExperimentIds || context.rankedExperimentIds.has(experimentId)),
  };
};

export const fetchRankingRuns = async (experimentIds: string[], signal?: AbortSignal) => {
  const runs: RunEntity[] = [];
  let pageToken: string | undefined;
  do {
    signal?.throwIfAborted();
    const response: SearchRunsApiResponse = await MlflowService.searchRuns({
      experiment_ids: experimentIds,
      run_view_type: 'ACTIVE_ONLY',
      filter: '',
      max_results: 1000,
      page_token: pageToken,
    });
    runs.push(...(response.runs ?? []));
    pageToken = response.next_page_token;
  } while (pageToken);
  return runs;
};

const ActiveRunTableRankingProvider = ({
  experiments,
  children,
}: {
  experiments: ExperimentEntity[];
  children: React.ReactNode;
}) => {
  const workspace = useActiveWorkspace();
  const experimentIds = experiments.map(({ experimentId }) => experimentId).sort();
  const { data } = useQuery({
    queryKey: ['mlflow-run-table-ranking', workspace, experimentIds],
    queryFn: ({ signal }) => fetchRankingRuns(experimentIds, signal),
    enabled: experimentIds.length > 0,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: false,
  });
  const value = useMemo(() => {
    const rankedExperimentIds = getRankableExperimentIds(data ?? []);
    return { enabled: rankedExperimentIds.size > 0, rankedExperimentIds, awards: buildRunTableRanking(data ?? []) };
  }, [data]);
  return <RunTableRankingContext.Provider value={value}>{children}</RunTableRankingContext.Provider>;
};

export const RunTableRankingProvider = (props: { experiments: ExperimentEntity[]; children: React.ReactNode }) => {
  const { workflowType } = useWorkflowType();
  return workflowType === WorkflowType.MACHINE_LEARNING ? (
    <ActiveRunTableRankingProvider {...props} />
  ) : (
    <>{props.children}</>
  );
};
