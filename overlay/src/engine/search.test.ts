import { test } from 'node:test'
import assert from 'node:assert/strict'
import { closestName, search } from './search.ts'

const items = [{ name: '마법 부여' }, { name: '마법 방패' }, { name: '무한 반복' }, { name: '대마법사' }, { name: 'ADAPt' }]

test('초성 검색: 초성·완성 글자 섞기, 띄어쓰기 무시, 앞에서 맞는 것부터', () => {
  assert.deepEqual(search(items, 'ㅁㅂ').map((x) => x.name), ['마법 부여', '마법 방패', '대마법사'])
  assert.deepEqual(search(items, '마법ㅂ').map((x) => x.name), ['마법 부여', '마법 방패'])
  assert.deepEqual(search(items, '법부').map((x) => x.name), ['마법 부여'])
  assert.deepEqual(search(items, 'adap').map((x) => x.name), ['ADAPt'])
  assert.deepEqual(search(items, ' '), [])
})

test('OCR 글자 → 가장 가까운 후보: 틀린 글자·띄어쓰기에 버틴다', () => {
  const twins = [{ name: '빵과 버터' }, { name: '빵과 잼' }, { name: '빵과 치즈' }, { name: '날쌘걸음' }, { name: '가속 추구' }]
  assert.equal(closestName('빵과버타', twins).it.name, '빵과 버터')
  assert.equal(closestName('빵과 짐', twins).it.name, '빵과 잼')
  assert.equal(closestName('날샌 걸음.', twins).it.name, '날쌘걸음')
  assert.equal(closestName('가속 추구', twins).score, 1)
})
