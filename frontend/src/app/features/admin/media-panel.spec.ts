import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MediaAssetDto } from '../../core/models';
import { MediaPanel } from './media-panel';

// the media-library thumbnail slot serves the derivative srcset
// (built by the server from disk truth) with the slot's fixed CSS width
// as `sizes`; an asset without derivatives (a WebP original, a
// pre-feature upload) degrades to plain `src` — no srcset attribute.

@Component({
  selector: 'mp-test-host',
  imports: [MediaPanel],
  template: `<app-media-panel [rows]="rows" />`,
})
class Host {
  rows: MediaAssetDto[] | null = null;
}

function asset(overrides: Partial<MediaAssetDto> = {}): MediaAssetDto {
  return {
    id: 1,
    url: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    storedFilename: '0123456789abcdef0123456789abcdef.jpg',
    originalFilename: 'kelder.jpg',
    contentType: 'image/jpeg',
    width: 1600,
    height: 900,
    sizeBytes: 204800,
    createdAt: '2026-09-01T09:00:00Z',
    reusedBy: 0,
    ...overrides,
  };
}

const SRCSET =
  '/api/media/0123456789abcdef0123456789abcdef-t96.jpg 96w, ' +
  '/api/media/0123456789abcdef0123456789abcdef-t192.jpg 192w';

describe('MediaPanel (derivative srcset)', () => {
  function render(rows: MediaAssetDto[] | null): HTMLElement {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rows = rows;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('the asset thumbnail carries the derivative srcset when the server has one (sizes = the 48 px slot)', () => {
    const el = render([asset({ srcset: SRCSET })]);
    const img = el.querySelector<HTMLImageElement>('img.admin-media-thumb');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(asset().url);
    expect(img?.getAttribute('srcset')).toBe(SRCSET);
    expect(img?.getAttribute('sizes')).toBe('48px');
  });

  it('an asset without derivatives renders plain src (no srcset attribute)', () => {
    const el = render([asset()]);
    const img = el.querySelector<HTMLImageElement>('img.admin-media-thumb');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(asset().url);
    expect(img?.hasAttribute('srcset')).toBe(false);
  });
});
