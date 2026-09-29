const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/core.js');

const NOW = new Date('2026-09-30T12:00:00');

function draft(overrides = {}) {
  return {
    type: 'lost', name: '蓝色折叠雨伞', location: '东3-405',
    date: '2026-09-23', time: '09:00', description: '白色贴纸',
    contact: 'test-qq', imageData: '', ...overrides,
  };
}

function item(overrides = {}) {
  return {
    id: 'lost-1', ownerId: 'owner-a', type: 'lost',
    name: '蓝色折叠雨伞', location: '东3-405', description: '白色贴纸',
    status: '寻找中', createdAt: '2026-09-23T09:00:00+08:00',
    ...overrides,
  };
}

test('T01 合法草稿没有校验错误，创建寻物记录时字段被修剪', () => {
  const input = draft({ name: '  蓝色折叠雨伞  ' });
  assert.deepEqual(core.validateDraft(input, NOW), {});
  const result = core.createItem(input, 'owner-a', 'new-1', NOW);
  assert.deepEqual(result.errors, {});
  assert.equal(result.item.name, '蓝色折叠雨伞');
  assert.equal(result.item.status, '寻找中');
  assert.equal(result.item.createdAt, NOW.toISOString());
});

test('T02 空白必填项和无效类型分别返回对应错误', () => {
  const errors = core.validateDraft(draft({
    type: 'other', name: '  ', location: '', date: '', time: '', contact: '\t',
  }), NOW);
  assert.deepEqual(Object.keys(errors).sort(),
    ['type', 'name', 'location', 'date', 'time', 'contact'].sort());
});

test('T03 无效日期和未来时间都被拒绝', () => {
  assert.equal(core.validateDraft(draft({ date: 'wrong' }), NOW).date, '日期或时间无效');
  assert.equal(core.validateDraft(draft({ date: '2026-10-01' }), NOW).date,
    '发生时间不能晚于现在');
});

test('T04 名称长度的 60/61 字边界', () => {
  assert.equal(core.validateDraft(draft({ name: '伞'.repeat(60) }), NOW).name, undefined);
  assert.equal(core.validateDraft(draft({ name: '伞'.repeat(61) }), NOW).name,
    '物品名称不能超过 60 字');
});

test('T05 创建招领记录使用招领中状态，缺少 ownerId 或 id 会失败', () => {
  const found = core.createItem(draft({ type: 'found' }), 'owner-a', 'new-2', NOW);
  assert.equal(found.item.status, '招领中');
  assert.equal(core.createItem(draft(), '', 'new-3', NOW).errors.form, '缺少发布者或编号');
  assert.equal(core.createItem(draft(), 'owner-a', '', NOW).item, null);
});

test('T06 空格、逗号和顿号拆分线索并匹配多个字段', () => {
  const records = [item(), item({ id: 'other', name: '雨伞', location: '图书馆' })];
  assert.deepEqual(core.parseSearchQuery(' 东三，雨伞、白色 ').terms, ['东3', '雨伞', '白色']);
  assert.deepEqual(core.listItems(records, { query: '东三, 雨伞、白色' }).map((x) => x.id),
    ['lost-1']);
});

test('T07 中文数字、全角字符和英文大小写归一化', () => {
  const records = [item({ name: 'ABC 耳机', location: '东3-305' })];
  assert.equal(core.listItems(records, { query: '东三 ａｂｃ' }).length, 1);
  assert.equal(core.listItems(records, { query: '东四 abc' }).length, 0);
});

test('T08 合法正则匹配原始字段，非法正则返回错误', () => {
  const records = [item(), item({ id: 'headphones', name: '黑色耳机' })];
  assert.deepEqual(core.listItems(records, { query: '/雨伞|耳机/' }).map((x) => x.id),
    ['lost-1', 'headphones']);
  assert.match(core.parseSearchQuery('/([/').error, /无效/);
  assert.match(core.parseSearchQuery('/雨伞/g').error, /仅支持/);
  assert.match(core.parseSearchQuery('/雨伞').error, /正则请写成/);
});

test('T09 类型、发布者、地点和进行中条件可以组合', () => {
  const records = [
    item(),
    item({ id: 'found-1', type: 'found', ownerId: 'owner-b', status: '招领中' }),
    item({ id: 'found-2', type: 'found', ownerId: 'owner-a', status: '已归还' }),
  ];
  assert.deepEqual(core.listItems(records, {
    type: 'found', ownerId: 'owner-b', location: '东3', includeFinished: false,
  }).map((x) => x.id), ['found-1']);
});

test('T10 进行中先于已结束，组内按发布时间倒序', () => {
  const records = [
    item({ id: 'old', createdAt: '2026-09-20T09:00:00+08:00' }),
    item({ id: 'done', status: '已找到', createdAt: '2026-09-30T09:00:00+08:00' }),
    item({ id: 'new', createdAt: '2026-09-25T09:00:00+08:00' }),
  ];
  assert.deepEqual(core.listItems(records).map((x) => x.id), ['new', 'old', 'done']);
  assert.deepEqual(core.listItems(records, { includeFinished: false }).map((x) => x.id),
    ['new', 'old']);
});

test('T11 正确发布者结束寻物，输入数组不被原地修改', () => {
  const records = [item()];
  const result = core.finishItem(records, 'lost-1', 'owner-a');
  assert.equal(result.error, null);
  assert.equal(result.item.status, '已找到');
  assert.equal(records[0].status, '寻找中');
  assert.notEqual(result.items, records);
});

test('T12 招领结束为已归还，旧状态已找回也视为已结束', () => {
  const found = item({ type: 'found', status: '招领中' });
  assert.equal(core.finishItem([found], found.id, 'owner-a').item.status, '已归还');
  assert.equal(core.isFinished(item({ status: '已找回' })), true);
});

test('T13 不存在的记录、越权操作和重复结束都返回具体错误', () => {
  const records = [item()];
  assert.equal(core.finishItem(records, 'missing', 'owner-a').error, '信息不存在');
  assert.equal(core.finishItem(records, 'lost-1', 'owner-b').error,
    '只能修改自己发布的信息');
  assert.equal(core.finishItem([item({ status: '已找到' })], 'lost-1', 'owner-a').error,
    '这条信息已结束');
});

test('T14 相反类型且同地点或同名称片段可生成候选', () => {
  const source = item();
  const records = [
    source,
    item({ id: 'by-place', type: 'found', status: '招领中', name: '黑色耳机' }),
    item({ id: 'by-name', type: 'found', status: '招领中',
      name: '折叠雨伞', location: '图书馆' }),
  ];
  const matches = core.findSimilarItems(source, records);
  assert.deepEqual(matches.map((entry) => entry.item.id), ['by-place', 'by-name']);
  assert.match(matches[0].reasons.join('；'), /地点相同/);
  assert.match(matches[1].reasons.join('；'), /名称共同关键词/);
});

test('T15 同类型、已结束、自身记录被排除；候选数量受 limit 约束', () => {
  const source = item();
  const records = [
    source,
    item({ id: 'same-type' }),
    item({ id: 'finished', type: 'found', status: '已归还' }),
    item({ id: 'active-1', type: 'found', status: '招领中' }),
    item({ id: 'active-2', type: 'found', status: '招领中' }),
  ];
  assert.equal(core.findSimilarItems(source, records).length, 2);
  assert.equal(core.findSimilarItems(source, records, 1).length, 1);
  assert.deepEqual(core.findSimilarItems(source, records, 0), []);
});
