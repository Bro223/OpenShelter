import { provenanceLabel } from './shelter-copy';

/**
 * The four provenance values are PINNED copy (accessibility-and-provenance
 * D4): the backend's three-valued source + the submitterVerified flag map
 * to exactly these strings, everywhere (map rows, detail header). A copy
 * change is a spec change — these assertions are the gate.
 */
describe('provenanceLabel (D4 copy)', () => {
  it('PAASETEAMET -> "Paasteamet registry"', () => {
    expect(provenanceLabel({ source: 'PAASETEAMET', submitterVerified: false })).toBe(
      'Paasteamet registry',
    );
  });

  it('MUNICIPALITY -> "Municipal registry"', () => {
    expect(provenanceLabel({ source: 'MUNICIPALITY', submitterVerified: false })).toBe(
      'Municipal registry',
    );
  });

  it('USER + submitterVerified -> "Verified user"', () => {
    expect(provenanceLabel({ source: 'USER', submitterVerified: true })).toBe('Verified user');
  });

  it('USER + !submitterVerified -> "User-submitted"', () => {
    expect(provenanceLabel({ source: 'USER', submitterVerified: false })).toBe('User-submitted');
  });

  it('registry rows are false-verified by contract (D3) and never read the flag', () => {
    // submitterVerified is only meaningful for USER rows — a stray true on a
    // registry row must not change the copy.
    expect(provenanceLabel({ source: 'PAASETEAMET', submitterVerified: true })).toBe(
      'Paasteamet registry',
    );
    expect(provenanceLabel({ source: 'MUNICIPALITY', submitterVerified: true })).toBe(
      'Municipal registry',
    );
  });
});
