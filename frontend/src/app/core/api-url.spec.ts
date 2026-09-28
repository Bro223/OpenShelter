import { environment } from '../../environments/environment';
import { ApiSrcsetPipe, ApiUrlPipe, prefixApiSrcset, prefixApiUrl } from './api-url';

describe('prefixApiUrl', () => {
  it('is the identity for a blank API base (the same-origin default)', () => {
    expect(prefixApiUrl('/api/media/abc.png', '')).toBe('/api/media/abc.png');
    expect(prefixApiUrl(null, '')).toBeNull();
  });

  it('leaves absolute and protocol-relative URLs untouched', () => {
    expect(prefixApiUrl('https://cdn.example.ee/x.png', 'https://api.example.ee')).toBe(
      'https://cdn.example.ee/x.png',
    );
    expect(prefixApiUrl('//cdn.example.ee/x.png', 'https://api.example.ee')).toBe(
      '//cdn.example.ee/x.png',
    );
  });

  it('prefixes the API base for a split build (a relative URL, a slashed base stripped)', () => {
    expect(prefixApiUrl('/api/media/abc.png', 'https://api.example.ee')).toBe(
      'https://api.example.ee/api/media/abc.png',
    );
  });
});

describe('prefixApiSrcset', () => {
  const SRCSET = '/api/media/abc-t96.png 96w, /api/media/abc-t192.png 192w';

  it('is the identity for a blank API base — byte-for-byte, whitespace included', () => {
    expect(prefixApiSrcset(SRCSET, '')).toBe(SRCSET);
    expect(prefixApiSrcset(null, '')).toBeNull();
  });

  it('resolves every entry against the API base, descriptors untouched', () => {
    expect(prefixApiSrcset(SRCSET, 'https://api.example.ee')).toBe(
      'https://api.example.ee/api/media/abc-t96.png 96w, https://api.example.ee/api/media/abc-t192.png 192w',
    );
  });

  it('handles entries without a descriptor', () => {
    expect(prefixApiSrcset('/api/media/abc.png', 'https://api.example.ee')).toBe(
      'https://api.example.ee/api/media/abc.png',
    );
  });
});

describe('the media pipes (this build)', () => {
  it('resolve against the API base baked into this build', () => {
    const base = environment.apiUrl.replace(/\/+$/, '');
    expect(new ApiUrlPipe().transform('/api/media/abc.png')).toBe(
      prefixApiUrl('/api/media/abc.png', base),
    );
    expect(new ApiUrlPipe().transform(null)).toBeNull();
    expect(new ApiSrcsetPipe().transform(null)).toBeNull();
    expect(new ApiSrcsetPipe().transform(SRCSET())).toBe(prefixApiSrcset(SRCSET(), base));
  });
});

function SRCSET(): string {
  return '/api/media/abc-t96.png 96w, /api/media/abc-t192.png 192w';
}
