import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import type { MineShelterDto, ShelterDto } from '../../core/models';
import { AccountGateway } from '../../gateways/account-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { ContributionsPanel } from './contributions-panel';

const SHELTER_ROW: MineShelterDto = {
  id: 7,
  address: null,
  name: 'Community Cellar',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'USER',
  createdAt: '2025-09-01T08:00:00Z',
  description: 'Neighbourhood basement',
  capacity: 12,
  submitterVerified: true, // own shelters: the author is a verified user
  nonexistentReports: 0,
  reportCount: 0, // total (all report types)
  openStatus: null,
  occupancy: null,
  reviewStatus: 'CONFIRMED',
  reviewNote: null,
  locationKind: 'PUBLIC',
  lastVerifiedAt: null, // null = never verified
  inaccurate: false, // no moderator mark on this row
  infoRequest: null, // no moderator question on this row
};

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  list = vi.fn();
  get = vi.fn();
  create = vi.fn();
  mine = vi.fn();
  update = vi.fn();
  remove = vi.fn();
  replyInfoRequest = vi.fn();
  constructor() {
    this.mine.mockResolvedValue([]);
  }
}

class FakeAccountGateway {
  me = vi.fn();
  updateProfile = vi.fn();
  requestEmailChange = vi.fn();
  confirmEmailChange = vi.fn();
  requestPhoneChange = vi.fn();
  confirmPhoneChange = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

/** One macrotask tick — lets the fire-and-forget gateway loads settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('ContributionsPanel', () => {
  let shelters: FakeShelterGateway;
  let account: FakeAccountGateway;

  async function open(): Promise<{
    page: ContributionsPanel;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<ContributionsPanel>>;
  }> {
    const fixture = TestBed.createComponent(ContributionsPanel);
    fixture.detectChanges(); // ngOnInit -> the shelters load starts
    await flush();
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
      fixture,
    };
  }

  function buttonByText(element: HTMLElement, label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      (b.textContent ?? '').includes(label),
    );
  }

  beforeEach(() => {
    shelters = new FakeShelterGateway();
    account = new FakeAccountGateway();
    TestBed.configureTestingModule({
      imports: [ContributionsPanel, RouterOutlet],
      providers: [
        provideRouter([]),
        { provide: ShelterGateway, useValue: shelters as unknown as ShelterGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
  });

  // ---- loading / empty / error states ---------------------------------------

  it('loads the shelter list and renders the rows', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { element } = await open();

    // shelter row: name + submission date
    expect(element.textContent).toContain('Community Cellar');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.some((a) => a.getAttribute('href') === '/shelters/7')).toBe(true);
  });

  it('offers "Submit a shelter" while shelters are present (map-crisis-actions regression pin)', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { element } = await open();

    // The action renders for every authenticated user — not only the empty state.
    const submitLinks = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('a[href="/submit"]'),
    );
    expect(submitLinks.some((a) => (a.textContent ?? '').trim() === 'Submit a shelter')).toBe(true);
    // The row itself still renders next to the action.
    expect(element.textContent).toContain('Community Cellar');
  });

  it('shows the empty shelter state with a /submit link', async () => {
    const { element } = await open();

    expect(element.textContent).toContain("You haven't submitted any shelters yet.");
    expect(element.querySelector('a[href="/submit"]')).not.toBeNull();
    // The empty state is a self-contained symmetric block (the spacing itself
    // is CSS-only in .contributions-empty — jsdom does not compute layout, so
    // the wrapper is the structural pin).
    const empty = element.querySelector('.contributions-empty');
    expect(empty, 'empty state must be wrapped in .contributions-empty').not.toBeNull();
    expect(empty?.querySelector('p.contributions-state')?.textContent).toContain(
      "You haven't submitted any shelters yet.",
    );
    expect(empty?.querySelector('a[href="/submit"]')).not.toBeNull();
  });

  it('a failed shelter load shows the error state and Retry re-fetches', async () => {
    const failure = ApiError.fromNetwork();
    shelters.mine.mockRejectedValue(failure);
    const { element, fixture } = await open();

    expect(element.querySelector('a[href="/submit"]')).toBeNull();
    expect(element.textContent).toContain('Cannot reach the backend');
    expect(buttonByText(element, 'Retry')).not.toBeNull();

    // the backend is back — Retry fetches and the row renders
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    fixture.debugElement.componentInstance.loadShelters();
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('Community Cellar');
  });

  // ---- shelter rows: edit ----------------------------------------------------

  it('Edit pre-fills the inline form from the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    fixture.detectChanges();

    expect(page.editName.value).toBe('Community Cellar');
    expect(page.editDescription.value).toBe('Neighbourhood basement');
    expect(page.editCapacity.value).toBe(12);
    expect(page.editLatitude.value).toBe(59.437);
    expect(page.editLongitude.value).toBe(24.754);
    expect(element.querySelector('#contrib-name')).not.toBeNull();
  });

  it('saving a valid shelter edit calls the gateway and updates the row in place', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const updated: ShelterDto = { ...SHELTER_ROW, name: 'Renamed Cellar', capacity: 20 };
    shelters.update.mockResolvedValue(updated);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('Renamed Cellar');
    page.editCapacity.setValue(20);

    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(shelters.update).toHaveBeenCalledTimes(1);
    expect(shelters.update).toHaveBeenCalledWith(7, {
      name: 'Renamed Cellar',
      latitude: 59.437,
      longitude: 24.754,
      description: 'Neighbourhood basement',
      capacity: 20,
    });
    // the row moved in place (no refetch: mine was only called once)
    expect(shelters.mine).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Renamed Cellar');
    expect(element.querySelector('#contrib-name')).toBeNull(); // form closed
  });

  it('does not save an invalid shelter edit and shows the field errors', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('   '); // whitespace-only fails the @NotBlank mirror
    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(shelters.update).not.toHaveBeenCalled();
    expect(element.textContent).toContain('A name (up to 200 characters) is required.');
    expect(element.querySelector('#contrib-name')).not.toBeNull(); // still open
  });

  it('a rejected shelter edit (403) shows a row error and keeps the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    shelters.update.mockRejectedValue(
      apiError(403, 'only the author may modify this shelter', '/api/shelters/7'),
    );
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('Varastatud');
    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(element.textContent).toContain('only the author may modify this shelter');
    // row unchanged and still present, form still open
    expect(element.textContent).toContain('Community Cellar');
    expect(element.querySelector('#contrib-name')).not.toBeNull();
  });

  // ---- info request -----------------------------------------------------------

  const OPEN_REQUEST = {
    message: 'Kas varjund on avatud?',
    requestedAt: '2026-09-13T10:00:00Z',
    replyMessage: null,
    repliedAt: null,
  };

  it('an open info request shows the amber chip and the Info button', async () => {
    shelters.mine.mockResolvedValue([{ ...SHELTER_ROW, infoRequest: OPEN_REQUEST }]);
    const { element } = await open();

    expect(element.textContent).toContain('Info request');
    expect(buttonByText(element, 'Info')).not.toBeNull();
  });

  it('a row without an info request renders no chip and no Info button', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { element } = await open();

    expect(element.textContent).not.toContain('Info request');
    expect(buttonByText(element, 'Info')).toBeFalsy();
  });

  it('the Info panel shows the open question with the reply form', async () => {
    shelters.mine.mockResolvedValue([{ ...SHELTER_ROW, infoRequest: OPEN_REQUEST }]);
    const { element, fixture } = await open();

    buttonByText(element, 'Info')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('A moderator is asking:');
    expect(element.textContent).toContain(OPEN_REQUEST.message);
    expect(element.querySelector('#contrib-info-reply')).not.toBeNull();
  });

  it('sending the reply POSTs the one-time answer and patches the row in place', async () => {
    shelters.mine.mockResolvedValue([{ ...SHELTER_ROW, infoRequest: OPEN_REQUEST }]);
    shelters.replyInfoRequest.mockResolvedValue(undefined);
    const { element, fixture } = await open();

    buttonByText(element, 'Info')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#contrib-info-reply')!;
    textarea.value = 'Jah, avatud on.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Send reply')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(shelters.replyInfoRequest).toHaveBeenCalledWith(7, 'Jah, avatud on.');
    // the row flips to answered: the chip disappears and the panel closed
    expect(element.textContent).not.toContain('Info request');
    expect(element.querySelector('#contrib-info-reply')).toBeNull();
  });

  it('an answered request stays viewable read-only (no reply form)', async () => {
    shelters.mine.mockResolvedValue([
      {
        ...SHELTER_ROW,
        infoRequest: {
          ...OPEN_REQUEST,
          replyMessage: 'Jah, avatud on.',
          repliedAt: '2026-09-13T11:00:00Z',
        },
      },
    ]);
    const { element, fixture } = await open();

    // answered: no chip, but the exchange is still reachable
    expect(element.textContent).not.toContain('Info request');
    buttonByText(element, 'Info')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Your reply');
    expect(element.textContent).toContain('Jah, avatud on.');
    expect(element.querySelector('#contrib-info-reply')).toBeNull();
  });

  it('a rejected reply (409) shows the row error and keeps the form open', async () => {
    shelters.mine.mockResolvedValue([{ ...SHELTER_ROW, infoRequest: OPEN_REQUEST }]);
    shelters.replyInfoRequest.mockRejectedValue(
      apiError(409, 'already been answered', '/api/shelters/7/info-request/reply'),
    );
    const { element, fixture } = await open();

    buttonByText(element, 'Info')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#contrib-info-reply')!;
    textarea.value = 'Uuesti?';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Send reply')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('already been answered');
    expect(element.querySelector('#contrib-info-reply')).not.toBeNull();
  });

  // ---- shelter rows: two-step delete ----------------------------------------

  it('shelter delete requires the second step, then removes the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    shelters.remove.mockResolvedValue(undefined);
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    fixture.detectChanges();

    // step 1: the confirm strip is armed, nothing deleted yet
    expect(element.textContent).toContain('Delete this shelter permanently?');
    // The prompt is a live region, so arming is announced.
    expect(element.querySelector('.confirm-strip [role="status"]')).not.toBeNull();
    expect(shelters.remove).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Community Cellar');

    page.confirmDeleteShelter(7);
    await flush();
    fixture.detectChanges();

    expect(shelters.remove).toHaveBeenCalledTimes(1);
    expect(shelters.remove).toHaveBeenCalledWith(7);
    // the shelter row is gone
    expect(element.textContent).toContain("You haven't submitted any shelters yet.");
  });

  it('cancel between the two steps deletes nothing', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    fixture.detectChanges();
    page.cancelDeleteShelter();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Confirm delete');
    expect(shelters.remove).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Community Cellar');
  });

  it('a rejected shelter delete (403) shows a row error and keeps the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    shelters.remove.mockRejectedValue(
      apiError(403, 'only the author may modify this shelter', '/api/shelters/7'),
    );
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    page.confirmDeleteShelter(7);
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('only the author may modify this shelter');
    expect(element.textContent).toContain('Community Cellar'); // row unchanged
    // the confirm strip reset — the user can retry
    expect(buttonByText(element, 'Delete')).not.toBeNull();
  });

  // ---- hidden own shelters (shelter-trust-and-reports / user-contributions) ----

  it('an auto-hidden own shelter is marked with the community report count and has no restore action', async () => {
    const hiddenRow: MineShelterDto = { ...SHELTER_ROW, status: 'INACTIVE', nonexistentReports: 5 };
    shelters.mine.mockResolvedValue([hiddenRow]);
    const { element } = await open();

    // The row renders (the owner's list includes INACTIVE rows) and carries
    // the exact hidden copy with the report count.
    expect(element.textContent).toContain('Community Cellar');
    expect(element.textContent).toContain('Hidden — reported by the community (5 reports)');
    // No restore action anywhere in the panel (admin-only restore).
    expect(element.textContent).not.toContain('Restore');
    expect(buttonByText(element, 'Restore')).toBeUndefined();
    // The row itself stays manageable: View/Edit/Delete are still offered.
    expect(buttonByText(element, 'Edit')).toBeDefined();
    expect(buttonByText(element, 'Delete')).toBeDefined();
    expect(element.querySelector('a[href="/shelters/7"]')).not.toBeNull();
  });

  it('a hidden shelter with a single report singularizes the copy', async () => {
    const hiddenRow: MineShelterDto = { ...SHELTER_ROW, status: 'INACTIVE', nonexistentReports: 1 };
    shelters.mine.mockResolvedValue([hiddenRow]);
    const { element } = await open();

    expect(element.textContent).toContain('Hidden — reported by the community (1 report)');
  });

  it('an active own shelter renders no hidden mark', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { element } = await open();

    expect(element.querySelector('.contrib-row__hidden')).toBeNull();
    expect(element.textContent).not.toContain('Hidden');
  });

  // ---- trust-state badges + admin note (community-review-queue) --------------

  it('each /mine shelter row carries its trust-state badge (NEW / CONFIRMED / REJECTED)', async () => {
    shelters.mine.mockResolvedValue([
      {
        ...SHELTER_ROW,
        id: 7,
        name: 'New Cellar',
        reviewStatus: 'NEW',
      },
      {
        ...SHELTER_ROW,
        id: 9,
        name: 'Reported Cellar',
        reviewStatus: 'CONFIRMED',
        status: 'INACTIVE',
        nonexistentReports: 5,
      },
      {
        ...SHELTER_ROW,
        id: 10,
        name: 'Rejected Cellar',
        reviewStatus: 'REJECTED',
        status: 'INACTIVE',
      },
    ]);
    const { element } = await open();

    const rows = element.querySelectorAll<HTMLElement>('.contrib-row');
    expect(rows.length).toBe(3);
    const [newRow, reportedRow, rejectedRow] = rows;
    expect(newRow.querySelector('.contrib-badge.badge--new')?.textContent?.trim()).toBe(
      'Newly added',
    );
    expect(reportedRow.querySelector('.contrib-badge.badge--user')?.textContent?.trim()).toBe(
      'Community-checked',
    );
    expect(rejectedRow.querySelector('.contrib-badge.badge--rejected')?.textContent?.trim()).toBe(
      'Rejected',
    );
  });

  it('a rejected row shows the admin note and NO auto-hide mark (the badge carries the state)', async () => {
    const rejectedRow: MineShelterDto = {
      ...SHELTER_ROW,
      reviewStatus: 'REJECTED',
      status: 'INACTIVE',
      nonexistentReports: 5,
      reviewNote: 'Could not verify the address',
    };
    shelters.mine.mockResolvedValue([rejectedRow]);
    const { element } = await open();

    expect(element.querySelector('.contrib-row__hidden')).toBeNull();
    expect(element.textContent).not.toContain('Hidden — reported by the community');
    expect(element.querySelector('.contrib-row__note')?.textContent?.trim()).toBe(
      'Admin note: Could not verify the address',
    );
  });

  it('a row without a review note renders no note line', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { element } = await open();

    expect(element.querySelector('.contrib-row__note')).toBeNull();
    expect(element.textContent).not.toContain('Admin note');
  });

  it('a marked row carries the single-sourced inaccurate warning line (M10 slice 4)', async () => {
    shelters.mine.mockResolvedValue([{ ...SHELTER_ROW, inaccurate: true }]);
    const { element } = await open();

    // the warning line (no admin note on this row — it is the only note)
    expect(element.querySelector('.contrib-row__note')?.textContent?.trim()).toBe(
      'Reported inaccurate — details may be wrong',
    );
    // the row stays listed and visible (no hidden treatment)
    expect(element.querySelectorAll('.contrib-row')).toHaveLength(1);
  });
});
