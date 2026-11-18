import type { RunEntity } from '../../../types';

export type RunTableAward = {
  tone?: 'gold' | 'green';
  metricWinners: Record<string, number>;
};

const normalize = (value: string) => value.trim().toLowerCase();
const metadata = (run: RunEntity) =>
  Object.fromEntries([...(run.data.params ?? []), ...(run.data.tags ?? [])].map(({ key, value }) => [key, value]));
const first = (values: Record<string, string>, keys: string[]) => keys.map((key) => values[key]).find(Boolean) ?? '';

export const getRunModelFamily = (run: RunEntity) => {
  const values = metadata(run);
  const name = normalize(
    first(values, ['model_family', 'model.family', 'model', 'model_name', 'architecture']) || run.info.runName || '',
  );
  // Match the longer names first: PointNet++ must never join the PointNet family.
  if (/^pointnet(?:\+\+|2|pp)(?:\b|[_\s-]|$)/.test(name)) return 'pointnet++';
  if (/^pointnet(?:\b|[_\s-]|$)/.test(name)) return 'pointnet';
  if (/^pointnext(?:\b|[_\s-]|$)/.test(name)) return 'pointnext';
  const family = name
    .split(/[·|]/)[0]
    .replace(/(?:[_\s-]+seed[_\s=-]*\d+).*$/, '')
    .trim();
  return family || run.info.runUuid;
};

// Only higher-is-better quality metrics receive a maximum marker, never losses or counters.
export const isAccuracyMetric = (key: string) =>
  /(?:^|[/_.-])(?:oa|macc|acc|accuracy|f1|iou|miou|auc|auroc|precision|recall|dice|r2)$/i.test(key);

const primaryKeys = [
  'best_instance_mIoU',
  'best_OA',
  'best_mIoU',
  'best_accuracy',
  'best_acc',
  'best_Macro_F1',
  'best_f1',
  'best_auc',
];
const finiteMetric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const getRankableExperimentIds = (runs: RunEntity[]) =>
  new Set(
    runs
      .filter(
        (run) =>
          run.info.lifecycleStage !== 'deleted' &&
          run.data.metrics?.some(
            ({ key, value }) => key.startsWith('best_') && isAccuracyMetric(key) && finiteMetric(value),
          ),
      )
      .map(({ info }) => info.experimentId),
  );

/** Rankings use the complete active experiment snapshot, not the table's filtered/hidden rows. */
export const buildRunTableRanking = (runs: RunEntity[]): Record<string, RunTableAward> => {
  const records = runs
    .filter((run) => run.info.lifecycleStage !== 'deleted')
    .map((run) => {
      const values = metadata(run);
      const metrics = Object.fromEntries((run.data.metrics ?? []).map(({ key, value }) => [key, value]));
      const rawTask = normalize(first(values, ['task', 'task_type']));
      const task =
        ({ partseg: 'segmentation', classification: 'classification', semseg: 'semantic' } as Record<string, string>)[
          rawTask
        ] ||
        rawTask ||
        ('best_instance_mIoU' in metrics ? 'segmentation' : 'best_OA' in metrics ? 'classification' : 'training');
      // The course's older and newer writers describe the same development split differently.
      // Training schedules/input formats are not evaluation protocols and do not split rankings.
      const protocol = first(values, ['evaluation_protocol', 'protocol', 'dataset_protocol']);
      const courseDevelopment =
        /^course(?:-development-normal_resampled| normal_resampled XYZ; train8858\/val985; official test unused)$/i.test(
          protocol,
        );
      const dimensions = [
        first(values, ['dataset', 'dataset_name']),
        first(values, ['comparison_group']) || 'unspecified',
        (courseDevelopment ? '' : protocol) || 'unspecified',
        first(values, ['evaluation_split', 'validation_split']) || (courseDevelopment ? 'development_validation' : ''),
        first(values, ['split_fingerprint', 'validation_split_fingerprint']) || 'unspecified',
        first(values, ['val_samples', 'validation_samples', 'eval_samples']),
      ].map(normalize);
      return { run, metrics, task, dimensions, scope: JSON.stringify([run.info.experimentId, task]) };
    });
  const scopes = new Map<string, typeof records>();
  records.forEach((record) => {
    const scope = scopes.get(record.scope) ?? [];
    scope.push(record);
    scopes.set(record.scope, scope);
  });
  const groups = new Map<string, typeof records>();
  for (const [scope, members] of scopes) {
    const known = members[0].dimensions.map(
      (_, index) => new Set(members.map((r) => r.dimensions[index]).filter(Boolean)),
    );
    for (const record of members) {
      // Missing metadata may inherit an unambiguous experiment convention. With conflicting
      // protocols, unknown runs stay isolated rather than being compared across those protocols.
      const dimensions = record.dimensions.map(
        (value, index) =>
          value ||
          (known[index].size === 1
            ? [...known[index]][0]
            : known[index].size > 1
              ? `unknown:${record.run.info.runUuid}`
              : ''),
      );
      const key = JSON.stringify([scope, dimensions]);
      const group = groups.get(key) ?? [];
      group.push(record);
      groups.set(key, group);
    }
  }
  const result: Record<string, RunTableAward> = {};
  for (const members of groups.values()) {
    const keys = new Set(members.flatMap(({ metrics }) => Object.keys(metrics)));
    const primary =
      primaryKeys.find((key) => keys.has(key)) ??
      [...keys].sort().find((key) => key.startsWith('best_') && isAccuracyMetric(key));
    if (!primary) continue;
    const winners = new Map<string, { id: string; value: number }>();
    const familyMax = new Map<string, number>();
    let maximum = -Infinity;
    for (const { run, metrics } of members) {
      const id = run.info.runUuid;
      const score = metrics[primary];
      if (finiteMetric(score)) {
        maximum = Math.max(maximum, score);
        const family = getRunModelFamily(run);
        familyMax.set(family, Math.max(familyMax.get(family) ?? -Infinity, score));
      }
      for (const [key, value] of Object.entries(metrics)) {
        if (!isAccuracyMetric(key) || !finiteMetric(value)) continue;
        const winner = winners.get(key);
        // Raw values decide rank. UUID breaks exact ties independently of table ordering.
        if (!winner || value > winner.value || (value === winner.value && id < winner.id)) {
          winners.set(key, { id, value });
        }
      }
      result[id] = { metricWinners: {} };
    }
    for (const { run, metrics } of members) {
      const score = metrics[primary];
      if (finiteMetric(score)) {
        result[run.info.runUuid].tone =
          score === maximum ? 'gold' : score === familyMax.get(getRunModelFamily(run)) ? 'green' : undefined;
      }
    }
    for (const [key, { id, value }] of winners) result[id].metricWinners[key] = value;
  }
  return result;
};
