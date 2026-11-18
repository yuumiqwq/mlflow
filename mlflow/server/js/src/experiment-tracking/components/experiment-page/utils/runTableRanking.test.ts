import { describe, expect, test } from '@jest/globals';
import type { RunEntity } from '../../../types';
import { buildRunTableRanking, getRunModelFamily, getRankableExperimentIds } from './runTableRanking';

const run = (
  id: string,
  model: string,
  score?: number,
  extra: Record<string, string> = {},
  metrics: Record<string, number> = {},
): RunEntity => ({
  info: { runUuid: id, runName: model, experimentId: '4', lifecycleStage: 'active' } as RunEntity['info'],
  data: {
    params: [],
    tags: Object.entries(extra).map(([key, value]) => ({ key, value })),
    metrics: Object.entries({ ...(score === undefined ? {} : { best_OA: score }), ...metrics }).map(([key, value]) => ({
      key,
      value,
    })) as RunEntity['data']['metrics'],
  },
});

describe('run table rankings', () => {
  test('enables only experiments with finite best quality metrics', () => {
    expect(
      getRankableExperimentIds([
        run('loss', 'model', undefined, {}, { best_loss: 1, epoch: 3, duration: 20, accuracy: 0.8 }),
        run('empty', 'model'),
        run('nan', 'model', NaN),
      ]).size,
    ).toBe(0);
    expect([...getRankableExperimentIds([run('a', 'PointNet', 0.9)])]).toEqual(['4']);
  });
  test('does not infer an explicit evaluation protocol or fingerprint for unverified runs', () => {
    const rows = [
      run('course', 'PointNet', 0.9, { evaluation_split: 'development_validation' }),
      run('changed', 'PointNet', 0.95, { protocol: 'course-development-other' }),
    ];
    expect(buildRunTableRanking(rows)['course'].tone).toBe('gold');
    expect(buildRunTableRanking(rows)['changed'].tone).toBe('gold');
  });
  test('ranks actual course metadata together, separates model families, and uses each column raw maximum', () => {
    const rows = [
      run('baseline', 'PointNet · 基线', 0.91472, {
        dataset: 'ModelNet40',
        task: 'classification',
        evaluation_split: 'development_validation',
      }),
      run(
        'pp',
        'PointNet++ SSG · 基线',
        0.939086,
        {
          model: 'pointnet2_ssg',
          task: 'classification',
          evaluation_split: 'development_validation',
          training_protocol: 'variable_batch_schedule',
        },
        { best_mAcc: 0.91 },
      ),
      run(
        'next',
        'PointNeXt-S C64 · 复现',
        0.937055,
        { protocol: 'course-development-normal_resampled' },
        { best_mAcc: 0.912 },
      ),
      run('seed2', 'PointNet seed2', 0.9),
      run('empty', 'Other'),
    ];
    const ranking = buildRunTableRanking(rows);
    expect(ranking['pp'].tone).toBe('gold');
    expect(ranking['baseline'].tone).toBe('green');
    expect(ranking['next'].tone).toBe('green');
    expect(ranking['seed2'].tone).toBeUndefined();
    expect(ranking['empty']?.tone).toBeUndefined();
    expect(ranking['pp'].metricWinners['best_OA']).toBe(0.939086);
    expect(ranking['next'].metricWinners['best_mAcc']).toBe(0.912);
    expect(ranking['pp'].metricWinners['best_mAcc']).toBeUndefined();
    rows[2].data.metrics[0].value = 0.95;
    expect(buildRunTableRanking(rows)['next'].tone).toBe('gold');
    expect(buildRunTableRanking(rows)['pp'].tone).toBe('green');
  });

  test('allows tied gold and family champions but exactly one stable metric winner, without rounded ranking', () => {
    const rows = [
      run('b', 'PointNet', 0.939086),
      run('a', 'PointNet++', 0.939086),
      run('c', 'PointNeXt', 0.939085),
      run('d', 'PointNeXt', 0.939085),
    ];
    const ranks = buildRunTableRanking(rows);
    expect(Object.values(ranks).map((r) => r.tone)).toEqual(['gold', 'gold', 'green', 'green']);
    expect(Object.keys(ranks['b'].metricWinners)).toHaveLength(0);
    expect(ranks['a'].metricWinners['best_OA']).toBe(0.939086);
    expect(buildRunTableRanking([...rows].reverse())).toEqual(ranks);
  });

  test.each([
    'dataset',
    'evaluation_protocol',
    'comparison_group',
    'split_fingerprint',
    'evaluation_split',
    'val_samples',
  ])('isolates incompatible %s and ambiguous missing metadata', (key) => {
    const rows = [
      run('a', 'PointNet', 0.8, { [key]: 'A' }),
      run('b', 'PointNet', 0.9, { [key]: 'B' }),
      run('unknown', 'PointNet', 0.7),
    ];
    expect(Object.values(buildRunTableRanking(rows)).map((r) => r.tone)).toEqual(['gold', 'gold', 'gold']);
  });

  test('separates experiments and tasks and ranks segmentation using instance mIoU', () => {
    const a = run(
      'segA',
      'PointNet',
      undefined,
      { task: 'partseg' },
      { best_instance_mIoU: 0.839, best_class_mIoU: 0.86 },
    );
    const b = run(
      'segB',
      'PointNet++',
      undefined,
      { task: 'segmentation' },
      { best_instance_mIoU: 0.8651, best_class_mIoU: 0.85 },
    );
    const c = run('class', 'PointNet', 0.9);
    const d = run('other', 'PointNet', 0.5);
    d.info.experimentId = '5';
    const r = buildRunTableRanking([a, b, c, d]);
    expect(r['segB'].tone).toBe('gold');
    expect(r['segA'].tone).toBe('green');
    expect(r['segA'].metricWinners['best_class_mIoU']).toBe(0.86);
    expect(r['class'].tone).toBe('gold');
    expect(r['other'].tone).toBe('gold');
  });

  test('ignores missing/nonfinite scores, deleted runs, losses and integer counters', () => {
    const deleted = run('deleted', 'PointNet', 1);
    deleted.info.lifecycleStage = 'deleted';
    const r = buildRunTableRanking([
      run('ok', 'PointNet', -1e-12, {}, { best_epoch: 42, loss: 1, train_samples: 100 }),
      run('nan', 'PointNet', NaN),
      run('inf', 'PointNet', Infinity),
      deleted,
    ]);
    expect(r['ok'].tone).toBe('gold');
    expect(r['ok'].metricWinners).toEqual({ best_OA: -1e-12 });
    expect(r['nan'].tone).toBeUndefined();
    expect(r['inf'].tone).toBeUndefined();
    expect(r['deleted']).toBeUndefined();
    expect(buildRunTableRanking([])).toEqual({});
  });

  test.each([
    ['PointNet++ SSG · 基线', 'pointnet++'],
    ['pointnet2_ssg', 'pointnet++'],
    ['PointNet · 基线', 'pointnet'],
    ['PointNeXt-S C64 · 复现', 'pointnext'],
    ['ResNet50 seed=42', 'resnet50'],
  ])('recognizes %s', (name, family) => {
    expect(getRunModelFamily(run('a', name))).toBe(family);
  });
});
