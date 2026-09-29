const test = require('node:test');
const assert = require('node:assert/strict');
const { KEY, createStore, DEMO_ITEMS } = require('../js/storage.js');

function memoryStorage(initial = null) {
  let value = initial;
  let failWrites = false;
  return {
    getItem() { return value; },
    setItem(_key, next) {
      if (failWrites) throw new Error('quota exceeded');
      value = next;
    },
    failWrites(next) { failWrites = next; },
    value() { return value; },
  };
}

function draft(overrides = {}) {
  return {
    type: 'lost', name: '测试雨伞', location: '图书馆',
    date: '2020-01-02', time: '10:00', description: '', contact: 'test-qq',
    imageData: '', ...overrides,
  };
}

test('T16 首次创建 store 写入三条演示信息和 clientId', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  assert.equal(store.getItems().length, DEMO_ITEMS.length);
  assert.equal(store.getMyItems().length, 0);
  assert.equal(JSON.parse(storage.value()).clientId, store.getClientId());
  assert.equal(store.isPersistent(), true);
});

test('T17 发布后我的记录可查询，重新创建 store 仍有同一记录和 clientId', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  const result = store.publish(draft());
  assert.equal(result.saved, true);
  assert.equal(store.getMyItems().length, 1);
  const reopened = createStore(storage);
  assert.equal(reopened.getClientId(), store.getClientId());
  assert.equal(reopened.getItem(result.item.id).name, '测试雨伞');
});

test('T18 发布时存储失败会回滚内存数据且不发送更新事件', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  let updates = 0;
  store.subscribe(() => { updates += 1; });
  storage.failWrites(true);
  const before = store.getItems();
  const result = store.publish(draft());
  assert.equal(result.saved, false);
  assert.match(result.errors.form, /无法保存/);
  assert.deepEqual(store.getItems(), before);
  assert.equal(updates, 0);
});

test('T19 状态更新写入存储；失败时状态回滚', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  const first = store.publish(draft()).item;
  storage.failWrites(true);
  assert.match(store.finish(first.id).error, /保存失败/);
  assert.equal(store.getItem(first.id).status, '寻找中');
  storage.failWrites(false);
  assert.equal(store.finish(first.id).item.status, '已找到');
  assert.equal(createStore(storage).getItem(first.id).status, '已找到');
});

test('T20 旧版已找回状态从存储读取时迁移为已找到', () => {
  const oldState = {
    version: 1, clientId: 'owner-a',
    items: [{ ...DEMO_ITEMS[1], ownerId: 'owner-a', status: '已找回' }],
  };
  const store = createStore(memoryStorage(JSON.stringify(oldState)));
  assert.equal(store.getMyItems()[0].status, '已找到');
});

test('T21 订阅者在成功发布时触发，取消订阅后不再触发', () => {
  const store = createStore(memoryStorage());
  let updates = 0;
  const unsubscribe = store.subscribe(() => { updates += 1; });
  store.publish(draft());
  assert.equal(updates, 1);
  unsubscribe();
  store.publish(draft({ name: '另一把雨伞' }));
  assert.equal(updates, 1);
});

test('T22 无效 JSON 会恢复演示数据，仍可正常发布', () => {
  const storage = memoryStorage('{bad json');
  const store = createStore(storage);
  assert.equal(store.getItems().length, DEMO_ITEMS.length);
  assert.equal(store.publish(draft()).saved, true);
  assert.equal(JSON.parse(storage.value()).version, 1);
});
