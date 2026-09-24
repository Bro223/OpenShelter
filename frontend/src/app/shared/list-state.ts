import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate-pipe';
import type { MessageKey } from '../core/i18n/messages';

/**
 * The paged list's two HONEST empty-ish states, in one component:
 *
 *  - `out-of-range` — the URL asks for a page PAST THE END of a NON-EMPTY
 *    scope (a hand-typed number, a stale shared link, a locale switch that
 *    shrank the scope). Rendered as an explicit translated notice with a
 *    "back to the first page" action — never a bare empty list.
 *  - `empty` — the scope is truly empty. Rendered as the notice only (no
 *    action — there is no first page to return to).
 *
 * <p>Presentation only, in the Pagination control's contract: the component
 * owns NO URL. The host decides the state (it knows the total) and receives
 * the intent through {@link onGoFirstPage} — the host writes the URL (a
 * page-level route on the public surfaces, a tab-namespaced query param in
 * an admin tab panel: the component carries no route, no router and no tab
 * knowledge, so it renders inside any container, tab panel included).
 *
 * <p>Copy stays per-surface: the host passes its own {@link MessageKey}s
 * (the surfaces keep distinct wording for the same state — "the index ends
 * at page N" vs "the list ends at page N" — and distinct action labels).
 */
type ListStateKind = 'out-of-range' | 'empty';

@Component({
  selector: 'app-list-state',
  imports: [TranslatePipe],
  templateUrl: './list-state.html',
  styleUrl: './list-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListState {
  /** Which state: the out-of-range notice + action, or the bare empty notice. */
  readonly kind = input.required<ListStateKind>();
  /** The notice copy key (the surface's own key for the state). */
  readonly messageKey = input.required<MessageKey>();
  /** Out-of-range only: the page the URL asked for (the notice's {page}). */
  readonly page = input(1);
  /** Out-of-range only: the real last page (the notice's {pages}). */
  readonly pages = input(1);
  /** Out-of-range only: the "back to the first page" action's label key;
   *  null renders the notice without the action. */
  readonly actionKey = input<MessageKey | null>(null);
  /** The host's intent: go back to the first page (the host writes the URL). */
  readonly onGoFirstPage = output<void>();
}
