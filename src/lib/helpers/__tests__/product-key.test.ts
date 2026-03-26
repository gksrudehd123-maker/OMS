import { describe, it, expect } from 'vitest';
import { generateProductKey } from '../product-key';

describe('generateProductKey', () => {
  it('상품명과 옵션으로 키 생성', () => {
    expect(generateProductKey('온열복대', '프리사이즈')).toBe('온열복대|프리사이즈');
  });

  it('앞뒤 공백 제거', () => {
    expect(generateProductKey('  온열복대  ', '  프리사이즈  ')).toBe('온열복대|프리사이즈');
  });

  it('옵션 없으면 빈 문자열', () => {
    expect(generateProductKey('온열복대', '')).toBe('온열복대|');
  });

  it('옵션이 undefined/null 처리', () => {
    expect(generateProductKey('온열복대', undefined as unknown as string)).toBe('온열복대|');
    expect(generateProductKey('온열복대', null as unknown as string)).toBe('온열복대|');
  });
});
