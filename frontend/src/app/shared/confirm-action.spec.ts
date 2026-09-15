import { ConfirmAction } from './confirm-action';

/**
 * The shared destructive-confirm primitive (accessibility F-04/F-12): one
 * owner of the armed state machine AND the focus move, exercised against the
 * same `[data-confirm-*]` markup the components render.
 *
 * The host is attached to the document because `focus()` only moves
 * `document.activeElement` for an element that is connected.
 */
describe('ConfirmAction', () => {
  let host: HTMLElement;
  let trigger: HTMLButtonElement;
  let confirmControl: HTMLButtonElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.innerHTML =
      '<button data-confirm-trigger="7">Delete</button>' +
      '<button data-confirm-focus="7">Confirm delete</button>';
    document.body.appendChild(host);
    trigger = host.querySelector('[data-confirm-trigger="7"]') as HTMLButtonElement;
    confirmControl = host.querySelector('[data-confirm-focus="7"]') as HTMLButtonElement;
  });

  afterEach(() => {
    host.remove();
  });

  /** The focus move waits for the task that renders the armed strip. */
  function nextTask(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('starts idle', () => {
    const confirm = new ConfirmAction<number>(host);

    expect(confirm.armed()).toBeNull();
    expect(confirm.isArmed(7)).toBe(false);
  });

  it('arm() holds the key + value and moves focus to the confirm control', async () => {
    const confirm = new ConfirmAction<number, string>(host);

    confirm.arm(7, 'suspend');

    expect(confirm.isArmed(7)).toBe(true);
    expect(confirm.isArmed(8)).toBe(false);
    expect(confirm.armed()).toEqual({ key: 7, value: 'suspend' });
    await nextTask();
    expect(document.activeElement).toBe(confirmControl);
  });

  it('cancel() disarms and returns focus to the trigger', async () => {
    const confirm = new ConfirmAction<number>(host);
    confirm.arm(7);
    await nextTask();

    confirm.cancel();

    expect(confirm.armed()).toBeNull();
    await nextTask();
    expect(document.activeElement).toBe(trigger);
  });

  it('cancel() while idle is a no-op — it never steals focus', async () => {
    const confirm = new ConfirmAction<number>(host);
    trigger.focus();

    confirm.cancel();
    await nextTask();

    expect(confirm.armed()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('disarm() drops the armed state without moving focus', async () => {
    const confirm = new ConfirmAction<number>(host);
    confirm.arm(7);
    await nextTask();
    expect(document.activeElement).toBe(confirmControl);

    confirm.disarm();
    await nextTask();

    expect(confirm.armed()).toBeNull();
    expect(document.activeElement).toBe(confirmControl);
  });

  it('an armed key without a matching control leaves focus where it was', async () => {
    const confirm = new ConfirmAction<string>(host);
    trigger.focus();

    confirm.arm('missing');
    await nextTask();

    expect(confirm.isArmed('missing')).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });
});
