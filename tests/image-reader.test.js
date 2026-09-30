const test = require('node:test');
const assert = require('node:assert/strict');
const { createImageReader } = require('../js/image-reader.js');

function harness() {
  const readers = [];
  const loaded = [];
  let errors = 0;
  let active = true;
  const control = createImageReader({
    makeReader() {
      const reader = {
        readyState: 0, aborted: false,
        readAsDataURL(file) { this.file = file; this.readyState = 1; },
        abort() { this.aborted = true; this.readyState = 2; },
        complete(value) { this.result = value; this.readyState = 2; this.onload(); },
      };
      readers.push(reader);
      return reader;
    },
    onLoad: (value) => loaded.push(value),
    onError: () => { errors += 1; },
    isActive: () => active,
  });
  return { control, readers, loaded, errors: () => errors, leave: () => { active = false; } };
}

test('T28 连续选择 A/B，旧读取被取消且晚到结果不能覆盖 B', () => {
  const h = harness();
  h.control.select('A');
  h.control.select('B');
  assert.equal(h.readers[0].aborted, true);
  h.readers[1].complete('data:B');
  h.readers[0].complete('data:A');
  h.readers[0].onerror();
  assert.deepEqual(h.loaded, ['data:B']);
  assert.equal(h.errors(), 0);
});

test('T29 清空选择及离开发布页后忽略旧读取结果', () => {
  const h = harness();
  h.control.select('A');
  h.control.select(null);
  h.readers[0].complete('data:A');
  h.control.select('B');
  h.leave();
  h.readers[1].complete('data:B');
  assert.deepEqual(h.loaded, []);
});

test('T30 当前读取错误有反馈，销毁后取消读取且不再创建读取任务', () => {
  const h = harness();
  h.control.select('A');
  h.readers[0].onerror();
  assert.equal(h.errors(), 1);
  h.control.dispose();
  assert.equal(h.readers[0].aborted, true);
  h.readers[0].onerror();
  h.readers[0].complete('data:A');
  h.control.select('B');
  assert.equal(h.readers.length, 1);
  assert.equal(h.errors(), 1);
  assert.deepEqual(h.loaded, []);
});
