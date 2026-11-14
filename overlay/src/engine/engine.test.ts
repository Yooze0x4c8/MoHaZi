// 실행: npm test (Node 내장 테스트, 갱플 예시 빌드 기준)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rate, rateCards, shouldReroll, suggestSwitch, type Build, type Tags } from './index.ts'

const gp: Build = {
  id: 'gp-ap-ult', name: 'AP 무한궁 갱플', style: 'fun',
  wantTags: { ult_haste: 1.0, ap: 0.8, ability_haste: 0.6 }, mustHave: [], avoidTags: ['crit']
}
const labels = { ult_haste: '궁 쿨감', ap: 'AP', ability_haste: '스킬 가속', crit: '치명타', tank: '탱', ms: '이동 속도' }
const tags: Tags = {
  1: ['ult_haste'],
  2: ['ap'],
  3: ['ability_haste'],
  4: ['crit'],
  5: ['ms'],
  6: ['ult_haste', 'ability_haste'],
  7: ['tank'],
  8: ['tank'],
  9: ['ability_haste', 'crit']
}

test('등급: 핵심 태그 S, 보조 A, 무관 B, 반대 C', () => {
  assert.equal(rate(1, gp, tags, labels).grade, 'S')
  assert.equal(rate(2, gp, tags, labels).grade, 'A')
  assert.equal(rate(3, gp, tags, labels).grade, 'A')
  assert.equal(rate(5, gp, tags, labels).grade, 'B')
  assert.equal(rate(4, gp, tags, labels).grade, 'C')
})

test('이유: 기여 큰 태그 순, 템플릿 문장', () => {
  assert.deepEqual(pick(rate(6, gp, tags, labels)), ['궁 쿨감 · 스킬 가속', 'AP 무한궁 갱플 핵심'])
  assert.deepEqual(pick(rate(5, gp, tags, labels)), ['이동 속도', '빌드와 무관'])
  assert.deepEqual(pick(rate(4, gp, tags, labels)), ['치명타', '빌드와 반대'])
  assert.deepEqual(pick(rate(99, gp, tags, labels)), ['특징 없음', '빌드와 무관'])
  // 좋은 태그가 섞여 있어도 C면 피할 태그를 보여준다
  assert.deepEqual(pick(rate(9, gp, tags, labels)), ['치명타', '빌드와 반대'])
})

test('추천: 세 장 중 최고 점수 카드', () => {
  assert.equal(rateCards([2, 1, 4], gp, tags, labels).pick, 1)
  // 못 알아본 카드는 등급 없이 빠진다
  const r = rateCards([2, null, 4], gp, tags, labels)
  assert.equal(r.cards[1], null)
  assert.equal(r.pick, 0)
})

test('리롤 권장: 세 장 모두 B 이하이고 리롤이 남았을 때만', () => {
  const low = rateCards([5, 4, 7], gp, tags, labels).cards
  assert.equal(shouldReroll(low, 1), true)
  assert.equal(shouldReroll(low, null), true)
  assert.equal(shouldReroll(low, 0), false)
  assert.equal(shouldReroll(rateCards([5, 4, 2], gp, tags, labels).cards, 1), false) // A가 하나 있음
  assert.equal(shouldReroll(rateCards([5, 4, null], gp, tags, labels).cards, 1), false) // 못 알아본 카드
})

test('필수 증강 보너스', () => {
  const r = rate(5, { ...gp, mustHave: [5] }, tags, labels)
  assert.equal(r.grade, 'S')
  assert.equal(r.reason, '필수 증강')
})

test('시너지: 고른 증강과 태그가 겹치면 점수가 오르고 이유가 바뀐다', () => {
  const before = rate(7, gp, tags, labels)
  const after = rate(7, gp, tags, labels, [8])
  assert.ok(after.score > before.score)
  assert.equal(after.detail, '고른 증강과 시너지')
})

const pick = (r: { reason: string; detail: string }) => [r.reason, r.detail]

test('전환 제안: 고른 증강이 다른 빌드에 훨씬 맞으면 제안', () => {
  const crit: Build = { id: 'crit', name: '치명타', style: 'meta', wantTags: { crit: 1 }, mustHave: [], avoidTags: ['ap'] }
  const s = suggestSwitch([1, 2], crit, [crit, gp], tags, labels)
  assert.equal(s?.to.id, gp.id)
  assert.ok(s!.toFit - s!.fromFit >= 20)
  assert.equal(s!.why, '고른 증강 2개가 모두 궁 쿨감 · AP 쪽이에요.')
  // 지금 빌드가 이미 제일 맞으면, 또는 고른 증강이 1개면 제안하지 않는다
  assert.equal(suggestSwitch([1, 2], gp, [crit, gp], tags, labels), null)
  assert.equal(suggestSwitch([1], crit, [crit, gp], tags, labels), null)
})
