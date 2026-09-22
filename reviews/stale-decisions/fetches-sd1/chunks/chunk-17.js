import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-R5BOUTCH.js");import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/legal/terms-page.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var TermsPage = class _TermsPage {
  /** i18n (M4): the page is fully catalog-driven (| t pipes), so a language
   *  switch must re-render the whole page. toObservable emits the CURRENT
   *  value on subscribe, so skip(1) — only a real switch triggers it
   *  (the account-page idiom). Unsubscribed in ngOnDestroy. */
  i18n = inject(I18nService);
  cdr = inject(ChangeDetectorRef);
  localeSub = toObservable(this.i18n.locale).pipe(skip(1)).subscribe(() => this.cdr.markForCheck());
  ngOnDestroy() {
    this.localeSub.unsubscribe();
  }
  static \u0275fac = function TermsPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TermsPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _TermsPage, selectors: [["app-terms-page"]], decls: 268, vars: 237, consts: [[1, "legal-page"], [1, "page-title"], [1, "legal-page__updated"], [1, "legal-page__toc"], ["routerLink", "/terms", "fragment", "acceptance"], ["routerLink", "/terms", "fragment", "service"], ["routerLink", "/terms", "fragment", "eligibility"], ["routerLink", "/terms", "fragment", "security"], ["routerLink", "/terms", "fragment", "rules"], ["routerLink", "/terms", "fragment", "prohibited"], ["routerLink", "/terms", "fragment", "license"], ["routerLink", "/terms", "fragment", "moderation"], ["routerLink", "/terms", "fragment", "official"], ["routerLink", "/terms", "fragment", "emergency"], ["routerLink", "/terms", "fragment", "warranty"], ["routerLink", "/terms", "fragment", "liability"], ["routerLink", "/terms", "fragment", "third-party"], ["routerLink", "/terms", "fragment", "availability"], ["routerLink", "/terms", "fragment", "source"], ["routerLink", "/terms", "fragment", "law"], ["routerLink", "/terms", "fragment", "contact"], ["id", "acceptance"], ["id", "service"], ["id", "eligibility"], ["id", "security"], ["id", "rules"], ["id", "prohibited"], ["id", "license"], ["id", "moderation"], ["id", "official"], ["id", "emergency"], ["id", "warranty"], ["id", "liability"], ["id", "third-party"], ["routerLink", "/privacy"], ["id", "availability"], ["id", "source"], ["id", "law"], ["id", "contact"]], template: function TermsPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "article", 0)(1, "h1", 1);
      i0.\u0275\u0275text(2);
      i0.\u0275\u0275pipe(3, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(4, "p", 2);
      i0.\u0275\u0275text(5);
      i0.\u0275\u0275pipe(6, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(7, "nav", 3);
      i0.\u0275\u0275pipe(8, "t");
      i0.\u0275\u0275elementStart(9, "ol")(10, "li")(11, "a", 4);
      i0.\u0275\u0275text(12);
      i0.\u0275\u0275pipe(13, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(14, "li")(15, "a", 5);
      i0.\u0275\u0275text(16);
      i0.\u0275\u0275pipe(17, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(18, "li")(19, "a", 6);
      i0.\u0275\u0275text(20);
      i0.\u0275\u0275pipe(21, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(22, "li")(23, "a", 7);
      i0.\u0275\u0275text(24);
      i0.\u0275\u0275pipe(25, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(26, "li")(27, "a", 8);
      i0.\u0275\u0275text(28);
      i0.\u0275\u0275pipe(29, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(30, "li")(31, "a", 9);
      i0.\u0275\u0275text(32);
      i0.\u0275\u0275pipe(33, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(34, "li")(35, "a", 10);
      i0.\u0275\u0275text(36);
      i0.\u0275\u0275pipe(37, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(38, "li")(39, "a", 11);
      i0.\u0275\u0275text(40);
      i0.\u0275\u0275pipe(41, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(42, "li")(43, "a", 12);
      i0.\u0275\u0275text(44);
      i0.\u0275\u0275pipe(45, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(46, "li")(47, "a", 13);
      i0.\u0275\u0275text(48);
      i0.\u0275\u0275pipe(49, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(50, "li")(51, "a", 14);
      i0.\u0275\u0275text(52);
      i0.\u0275\u0275pipe(53, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(54, "li")(55, "a", 15);
      i0.\u0275\u0275text(56);
      i0.\u0275\u0275pipe(57, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(58, "li")(59, "a", 16);
      i0.\u0275\u0275text(60);
      i0.\u0275\u0275pipe(61, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(62, "li")(63, "a", 17);
      i0.\u0275\u0275text(64);
      i0.\u0275\u0275pipe(65, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(66, "li")(67, "a", 18);
      i0.\u0275\u0275text(68);
      i0.\u0275\u0275pipe(69, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(70, "li")(71, "a", 19);
      i0.\u0275\u0275text(72);
      i0.\u0275\u0275pipe(73, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(74, "li")(75, "a", 20);
      i0.\u0275\u0275text(76);
      i0.\u0275\u0275pipe(77, "t");
      i0.\u0275\u0275elementEnd()()()();
      i0.\u0275\u0275elementStart(78, "section", 21)(79, "h2");
      i0.\u0275\u0275text(80);
      i0.\u0275\u0275pipe(81, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(82, "p");
      i0.\u0275\u0275text(83);
      i0.\u0275\u0275pipe(84, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(85, "section", 22)(86, "h2");
      i0.\u0275\u0275text(87);
      i0.\u0275\u0275pipe(88, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(89, "p");
      i0.\u0275\u0275text(90);
      i0.\u0275\u0275pipe(91, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(92, "p");
      i0.\u0275\u0275text(93);
      i0.\u0275\u0275pipe(94, "t");
      i0.\u0275\u0275elementStart(95, "strong");
      i0.\u0275\u0275text(96);
      i0.\u0275\u0275pipe(97, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(98);
      i0.\u0275\u0275pipe(99, "t");
      i0.\u0275\u0275elementStart(100, "strong");
      i0.\u0275\u0275text(101);
      i0.\u0275\u0275pipe(102, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(103);
      i0.\u0275\u0275pipe(104, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(105, "section", 23)(106, "h2");
      i0.\u0275\u0275text(107);
      i0.\u0275\u0275pipe(108, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(109, "p");
      i0.\u0275\u0275text(110);
      i0.\u0275\u0275pipe(111, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(112, "section", 24)(113, "h2");
      i0.\u0275\u0275text(114);
      i0.\u0275\u0275pipe(115, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(116, "p");
      i0.\u0275\u0275text(117);
      i0.\u0275\u0275pipe(118, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(119, "section", 25)(120, "h2");
      i0.\u0275\u0275text(121);
      i0.\u0275\u0275pipe(122, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(123, "ul")(124, "li");
      i0.\u0275\u0275text(125);
      i0.\u0275\u0275pipe(126, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(127, "li");
      i0.\u0275\u0275text(128);
      i0.\u0275\u0275pipe(129, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(130, "li");
      i0.\u0275\u0275text(131);
      i0.\u0275\u0275pipe(132, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(133, "li");
      i0.\u0275\u0275text(134);
      i0.\u0275\u0275pipe(135, "t");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(136, "section", 26)(137, "h2");
      i0.\u0275\u0275text(138);
      i0.\u0275\u0275pipe(139, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(140, "p");
      i0.\u0275\u0275text(141);
      i0.\u0275\u0275pipe(142, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(143, "ul")(144, "li");
      i0.\u0275\u0275text(145);
      i0.\u0275\u0275pipe(146, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(147, "li");
      i0.\u0275\u0275text(148);
      i0.\u0275\u0275pipe(149, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(150, "li");
      i0.\u0275\u0275text(151);
      i0.\u0275\u0275pipe(152, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(153, "li");
      i0.\u0275\u0275text(154);
      i0.\u0275\u0275pipe(155, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(156, "li");
      i0.\u0275\u0275text(157);
      i0.\u0275\u0275pipe(158, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(159, "p");
      i0.\u0275\u0275text(160);
      i0.\u0275\u0275pipe(161, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(162, "section", 27)(163, "h2");
      i0.\u0275\u0275text(164);
      i0.\u0275\u0275pipe(165, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(166, "p");
      i0.\u0275\u0275text(167);
      i0.\u0275\u0275pipe(168, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(169, "section", 28)(170, "h2");
      i0.\u0275\u0275text(171);
      i0.\u0275\u0275pipe(172, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(173, "p");
      i0.\u0275\u0275text(174);
      i0.\u0275\u0275pipe(175, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(176, "section", 29)(177, "h2");
      i0.\u0275\u0275text(178);
      i0.\u0275\u0275pipe(179, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(180, "p");
      i0.\u0275\u0275text(181);
      i0.\u0275\u0275pipe(182, "t");
      i0.\u0275\u0275elementStart(183, "em");
      i0.\u0275\u0275text(184);
      i0.\u0275\u0275pipe(185, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(186);
      i0.\u0275\u0275pipe(187, "t");
      i0.\u0275\u0275elementStart(188, "strong");
      i0.\u0275\u0275text(189);
      i0.\u0275\u0275pipe(190, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(191, "p");
      i0.\u0275\u0275text(192);
      i0.\u0275\u0275pipe(193, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(194, "section", 30)(195, "h2");
      i0.\u0275\u0275text(196);
      i0.\u0275\u0275pipe(197, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(198, "p");
      i0.\u0275\u0275text(199);
      i0.\u0275\u0275pipe(200, "t");
      i0.\u0275\u0275elementStart(201, "strong");
      i0.\u0275\u0275text(202);
      i0.\u0275\u0275pipe(203, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(204);
      i0.\u0275\u0275pipe(205, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(206, "p");
      i0.\u0275\u0275text(207);
      i0.\u0275\u0275pipe(208, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(209, "section", 31)(210, "h2");
      i0.\u0275\u0275text(211);
      i0.\u0275\u0275pipe(212, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(213, "p");
      i0.\u0275\u0275text(214);
      i0.\u0275\u0275pipe(215, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(216, "section", 32)(217, "h2");
      i0.\u0275\u0275text(218);
      i0.\u0275\u0275pipe(219, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(220, "p");
      i0.\u0275\u0275text(221);
      i0.\u0275\u0275pipe(222, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(223, "section", 33)(224, "h2");
      i0.\u0275\u0275text(225);
      i0.\u0275\u0275pipe(226, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(227, "p");
      i0.\u0275\u0275text(228);
      i0.\u0275\u0275pipe(229, "t");
      i0.\u0275\u0275elementStart(230, "a", 34);
      i0.\u0275\u0275text(231);
      i0.\u0275\u0275pipe(232, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(233);
      i0.\u0275\u0275pipe(234, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(235, "section", 35)(236, "h2");
      i0.\u0275\u0275text(237);
      i0.\u0275\u0275pipe(238, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(239, "p");
      i0.\u0275\u0275text(240);
      i0.\u0275\u0275pipe(241, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(242, "section", 36)(243, "h2");
      i0.\u0275\u0275text(244);
      i0.\u0275\u0275pipe(245, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(246, "p");
      i0.\u0275\u0275text(247);
      i0.\u0275\u0275pipe(248, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(249, "section", 37)(250, "h2");
      i0.\u0275\u0275text(251);
      i0.\u0275\u0275pipe(252, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(253, "p");
      i0.\u0275\u0275text(254);
      i0.\u0275\u0275pipe(255, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(256, "section", 38)(257, "h2");
      i0.\u0275\u0275text(258);
      i0.\u0275\u0275pipe(259, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(260, "p");
      i0.\u0275\u0275text(261);
      i0.\u0275\u0275pipe(262, "t");
      i0.\u0275\u0275elementStart(263, "a", 34);
      i0.\u0275\u0275text(264);
      i0.\u0275\u0275pipe(265, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(266);
      i0.\u0275\u0275pipe(267, "t");
      i0.\u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 79, "legal.terms.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 81, "legal.terms.updated"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(8, 83, "legal.toc.aria"));
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(13, 85, "legal.terms.acceptance"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(17, 87, "legal.terms.service"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(21, 89, "legal.terms.eligibility"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(25, 91, "legal.terms.security"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(29, 93, "legal.terms.rules"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(33, 95, "legal.terms.prohibited"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(37, 97, "legal.terms.license"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(41, 99, "legal.terms.moderation"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(45, 101, "legal.terms.official"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(49, 103, "legal.terms.emergency"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(53, 105, "legal.terms.warranty"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(57, 107, "legal.terms.liability"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(61, 109, "legal.terms.thirdParty"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(65, 111, "legal.terms.availability"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(69, 113, "legal.terms.source"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(73, 115, "legal.terms.law"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(77, 117, "legal.terms.contact"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(81, 119, "legal.terms.acceptance"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(84, 121, "legal.terms.acceptance.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(88, 123, "legal.terms.service"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(91, 125, "legal.terms.service.p1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(94, 127, "legal.terms.service.p2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(97, 129, "legal.terms.service.p2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(99, 131, "legal.terms.service.p2.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(102, 133, "legal.terms.emergencyNumber"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(104, 135, "legal.terms.service.p2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(108, 137, "legal.terms.eligibility"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(111, 139, "legal.terms.eligibility.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(115, 141, "legal.terms.security"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(118, 143, "legal.terms.security.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(122, 145, "legal.terms.rules"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(126, 147, "legal.terms.rules.li1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(129, 149, "legal.terms.rules.li2"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(132, 151, "legal.terms.rules.li3"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(135, 153, "legal.terms.rules.li4"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(139, 155, "legal.terms.prohibited"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(142, 157, "legal.terms.prohibited.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(146, 159, "legal.terms.prohibited.li1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(149, 161, "legal.terms.prohibited.li2"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(152, 163, "legal.terms.prohibited.li3"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(155, 165, "legal.terms.prohibited.li4"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(158, 167, "legal.terms.prohibited.li5"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(161, 169, "legal.terms.prohibited.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(165, 171, "legal.terms.license"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(168, 173, "legal.terms.license.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(172, 175, "legal.terms.moderation"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(175, 177, "legal.terms.moderation.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(179, 179, "legal.terms.official"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(182, 181, "legal.terms.official.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(185, 183, "legal.terms.official.p1.em"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(187, 185, "legal.terms.official.p1.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(190, 187, "legal.terms.official.p1.strong"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(193, 189, "legal.terms.official.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(197, 191, "legal.terms.emergency"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(200, 193, "legal.terms.emergency.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(203, 195, "legal.terms.emergencyNumber"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(205, 197, "legal.terms.emergency.p1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(208, 199, "legal.terms.emergency.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(212, 201, "legal.terms.warranty"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(215, 203, "legal.terms.warranty.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(219, 205, "legal.terms.liability"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(222, 207, "legal.terms.liability.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(226, 209, "legal.terms.thirdParty"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(229, 211, "legal.terms.thirdParty.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(232, 213, "legal.terms.thirdParty.p1.link"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(234, 215, "legal.terms.thirdParty.p1.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(238, 217, "legal.terms.availability"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(241, 219, "legal.terms.availability.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(245, 221, "legal.terms.source"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(248, 223, "legal.terms.source.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(252, 225, "legal.terms.law"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(255, 227, "legal.terms.law.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(259, 229, "legal.terms.contact"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(262, 231, "legal.terms.contact.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(265, 233, "legal.terms.contact.p1.link"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(267, 235, "legal.terms.contact.p1.after"), " ");
    }
  }, dependencies: [RouterLink, TranslatePipe], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.legal-page[_ngcontent-%COMP%] {\n  max-width: 46rem;\n  margin: var(--%NS%space-32) auto 0;\n  padding: 0 var(--%NS%space-16) var(--%NS%space-32);\n}\n.legal-page[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-24);\n}\n.legal-page[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-lg);\n}\n.legal-page[_ngcontent-%COMP%]   p[_ngcontent-%COMP%], \n.legal-page[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n}\n.legal-page[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  padding-left: var(--%NS%space-16);\n  list-style: disc;\n}\n.legal-page[_ngcontent-%COMP%] {\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__updated[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: 0 0 var(--%NS%space-20);\n}\n.legal-page[_ngcontent-%COMP%] {\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__toc[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  background: var(--%NS%color-bg-subtle);\n  padding: var(--%NS%space-16) var(--%NS%space-20);\n  margin: 0 0 var(--%NS%space-24);\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__toc[_ngcontent-%COMP%]   ol[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-left: var(--%NS%space-16);\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-6);\n}\n/*# sourceMappingURL=terms-page.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(TermsPage, [{
    type: Component,
    args: [{ selector: "app-terms-page", imports: [RouterLink, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<article class="legal-page">
  <h1 class="page-title">{{ 'legal.terms.title' | t }}</h1>
  <p class="legal-page__updated">{{ 'legal.terms.updated' | t }}</p>

  <nav class="legal-page__toc" [attr.aria-label]="'legal.toc.aria' | t">
    <ol>
      <li><a routerLink="/terms" fragment="acceptance">{{ 'legal.terms.acceptance' | t }}</a></li>
      <li><a routerLink="/terms" fragment="service">{{ 'legal.terms.service' | t }}</a></li>
      <li><a routerLink="/terms" fragment="eligibility">{{ 'legal.terms.eligibility' | t }}</a></li>
      <li><a routerLink="/terms" fragment="security">{{ 'legal.terms.security' | t }}</a></li>
      <li><a routerLink="/terms" fragment="rules">{{ 'legal.terms.rules' | t }}</a></li>
      <li>
        <a routerLink="/terms" fragment="prohibited">{{ 'legal.terms.prohibited' | t }}</a>
      </li>
      <li><a routerLink="/terms" fragment="license">{{ 'legal.terms.license' | t }}</a></li>
      <li><a routerLink="/terms" fragment="moderation">{{ 'legal.terms.moderation' | t }}</a></li>
      <li><a routerLink="/terms" fragment="official">{{ 'legal.terms.official' | t }}</a></li>
      <li><a routerLink="/terms" fragment="emergency">{{ 'legal.terms.emergency' | t }}</a></li>
      <li><a routerLink="/terms" fragment="warranty">{{ 'legal.terms.warranty' | t }}</a></li>
      <li><a routerLink="/terms" fragment="liability">{{ 'legal.terms.liability' | t }}</a></li>
      <li>
        <a routerLink="/terms" fragment="third-party">{{ 'legal.terms.thirdParty' | t }}</a>
      </li>
      <li>
        <a routerLink="/terms" fragment="availability">{{ 'legal.terms.availability' | t }}</a>
      </li>
      <li><a routerLink="/terms" fragment="source">{{ 'legal.terms.source' | t }}</a></li>
      <li><a routerLink="/terms" fragment="law">{{ 'legal.terms.law' | t }}</a></li>
      <li><a routerLink="/terms" fragment="contact">{{ 'legal.terms.contact' | t }}</a></li>
    </ol>
  </nav>

  <section id="acceptance">
    <h2>{{ 'legal.terms.acceptance' | t }}</h2>
    <p>{{ 'legal.terms.acceptance.p1' | t }}</p>
  </section>

  <section id="service">
    <h2>{{ 'legal.terms.service' | t }}</h2>
    <p>{{ 'legal.terms.service.p1' | t }}</p>
    <p>
      {{ 'legal.terms.service.p2.before' | t }}<strong>{{ 'legal.terms.service.p2.strong' | t
      }}</strong>{{ 'legal.terms.service.p2.middle' | t
      }}<strong>{{ 'legal.terms.emergencyNumber' | t }}</strong
      >{{ 'legal.terms.service.p2.after' | t }}
    </p>
  </section>

  <section id="eligibility">
    <h2>{{ 'legal.terms.eligibility' | t }}</h2>
    <p>{{ 'legal.terms.eligibility.p1' | t }}</p>
  </section>

  <section id="security">
    <h2>{{ 'legal.terms.security' | t }}</h2>
    <p>{{ 'legal.terms.security.p1' | t }}</p>
  </section>

  <section id="rules">
    <h2>{{ 'legal.terms.rules' | t }}</h2>
    <ul>
      <li>{{ 'legal.terms.rules.li1' | t }}</li>
      <li>{{ 'legal.terms.rules.li2' | t }}</li>
      <li>{{ 'legal.terms.rules.li3' | t }}</li>
      <li>{{ 'legal.terms.rules.li4' | t }}</li>
    </ul>
  </section>

  <section id="prohibited">
    <h2>{{ 'legal.terms.prohibited' | t }}</h2>
    <p>{{ 'legal.terms.prohibited.p1' | t }}</p>
    <ul>
      <li>{{ 'legal.terms.prohibited.li1' | t }}</li>
      <li>{{ 'legal.terms.prohibited.li2' | t }}</li>
      <li>{{ 'legal.terms.prohibited.li3' | t }}</li>
      <li>{{ 'legal.terms.prohibited.li4' | t }}</li>
      <li>{{ 'legal.terms.prohibited.li5' | t }}</li>
    </ul>
    <p>{{ 'legal.terms.prohibited.p2' | t }}</p>
  </section>

  <section id="license">
    <h2>{{ 'legal.terms.license' | t }}</h2>
    <p>{{ 'legal.terms.license.p1' | t }}</p>
  </section>

  <section id="moderation">
    <h2>{{ 'legal.terms.moderation' | t }}</h2>
    <p>{{ 'legal.terms.moderation.p1' | t }}</p>
  </section>

  <section id="official">
    <h2>{{ 'legal.terms.official' | t }}</h2>
    <p>
      {{ 'legal.terms.official.p1.before' | t }}<em>{{ 'legal.terms.official.p1.em' | t
      }}</em>{{ 'legal.terms.official.p1.middle' | t
      }}<strong>{{ 'legal.terms.official.p1.strong' | t }}</strong>
    </p>
    <p>{{ 'legal.terms.official.p2' | t }}</p>
  </section>

  <section id="emergency">
    <h2>{{ 'legal.terms.emergency' | t }}</h2>
    <p>
      {{ 'legal.terms.emergency.p1.before' | t
      }}<strong>{{ 'legal.terms.emergencyNumber' | t }}</strong
      >{{ 'legal.terms.emergency.p1.after' | t }}
    </p>
    <p>{{ 'legal.terms.emergency.p2' | t }}</p>
  </section>

  <section id="warranty">
    <h2>{{ 'legal.terms.warranty' | t }}</h2>
    <p>{{ 'legal.terms.warranty.p1' | t }}</p>
  </section>

  <section id="liability">
    <h2>{{ 'legal.terms.liability' | t }}</h2>
    <p>{{ 'legal.terms.liability.p1' | t }}</p>
  </section>

  <section id="third-party">
    <h2>{{ 'legal.terms.thirdParty' | t }}</h2>
    <p>
      {{ 'legal.terms.thirdParty.p1.before' | t
      }}<a routerLink="/privacy">{{ 'legal.terms.thirdParty.p1.link' | t }}</a
      >{{ 'legal.terms.thirdParty.p1.after' | t }}
    </p>
  </section>

  <section id="availability">
    <h2>{{ 'legal.terms.availability' | t }}</h2>
    <p>{{ 'legal.terms.availability.p1' | t }}</p>
  </section>

  <section id="source">
    <h2>{{ 'legal.terms.source' | t }}</h2>
    <p>{{ 'legal.terms.source.p1' | t }}</p>
  </section>

  <section id="law">
    <h2>{{ 'legal.terms.law' | t }}</h2>
    <p>{{ 'legal.terms.law.p1' | t }}</p>
  </section>

  <section id="contact">
    <h2>{{ 'legal.terms.contact' | t }}</h2>
    <p>
      {{ 'legal.terms.contact.p1.before' | t
      }}<a routerLink="/privacy">{{ 'legal.terms.contact.p1.link' | t }}</a
      >{{ 'legal.terms.contact.p1.after' | t }}
    </p>
  </section>
</article>
`, styles: ["/* src/app/features/legal/terms-page.scss */\n:host {\n  display: block;\n}\n.legal-page {\n  max-width: 46rem;\n  margin: var(--space-32) auto 0;\n  padding: 0 var(--space-16) var(--space-32);\n}\n.legal-page section {\n  margin-bottom: var(--space-24);\n}\n.legal-page h2 {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-lg);\n}\n.legal-page p,\n.legal-page ul {\n  margin: 0 0 var(--space-8);\n}\n.legal-page ul {\n  padding-left: var(--space-16);\n  list-style: disc;\n}\n.legal-page {\n}\n.legal-page .legal-page__updated {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: 0 0 var(--space-20);\n}\n.legal-page {\n}\n.legal-page .legal-page__toc {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  background: var(--color-bg-subtle);\n  padding: var(--space-16) var(--space-20);\n  margin: 0 0 var(--space-24);\n}\n.legal-page .legal-page__toc ol {\n  margin: 0;\n  padding-left: var(--space-16);\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-6);\n}\n/*# sourceMappingURL=terms-page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(TermsPage, { className: "TermsPage", filePath: "src/app/features/legal/terms-page.ts", lineNumber: 28 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Flegal%2Fterms-page.ts%40TermsPage";
  function TermsPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(TermsPage, m.default, [i0], [RouterLink, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && TermsPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && TermsPage_HmrLoad(d.timestamp)));
})();
export {
  TermsPage
};
//# debugId=bb394dcb-4e6f-5f9f-8480-e98ce385d01d


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvbGVnYWwvdGVybXMtcGFnZS50cyIsInNyYy9hcHAvZmVhdHVyZXMvbGVnYWwvdGVybXMtcGFnZS5odG1sIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50LFxuICBPbkRlc3Ryb3ksXG4gIGluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyB0b09ic2VydmFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlL3J4anMtaW50ZXJvcCc7XG5pbXBvcnQgeyBSb3V0ZXJMaW5rIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IHNraXAgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IEkxOG5TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL2kxOG4uc2VydmljZSc7XG5pbXBvcnQgeyBUcmFuc2xhdGVQaXBlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlJztcblxuLyoqXG4gKiBTdGF0aWMgdGVybXMgb2YgdXNlIChsZWdhbC1yZWNvdmVyeSwgaTE4biBNNCkuIE5vIGJhY2tlbmQsIG5vIHN0YXRlIOKAlFxuICogY2F0YWxvZyBjb3B5IChgbGVnYWwudGVybXMuKmAga2V5cywgRU4gdmVyYmF0aW0gZnJvbSB0aGUgb2xkIHN0YXRpY1xuICogdGVtcGxhdGUpLiBNaXJyb3JzIHRoZSBhcHAncyBvd24gc2FmZXR5IG5vdGljZSAobm90IGFuIG9mZmljaWFsIGVtZXJnZW5jeVxuICogc2VydmljZSwgMTEyIGZpcnN0KSBhbmQgdGhlIGxvY2tlZCB0cnVzdCBtb2RlbCAodmVyaWZpZWQgdXNlciDiiaAgdmVyaWZpZWRcbiAqIHNoZWx0ZXIpLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtdGVybXMtcGFnZScsXG4gIGltcG9ydHM6IFtSb3V0ZXJMaW5rLCBUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL3Rlcm1zLXBhZ2UuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi90ZXJtcy1wYWdlLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgVGVybXNQYWdlIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLyoqIGkxOG4gKE00KTogdGhlIHBhZ2UgaXMgZnVsbHkgY2F0YWxvZy1kcml2ZW4gKHwgdCBwaXBlcyksIHNvIGEgbGFuZ3VhZ2VcbiAgICogIHN3aXRjaCBtdXN0IHJlLXJlbmRlciB0aGUgd2hvbGUgcGFnZS4gdG9PYnNlcnZhYmxlIGVtaXRzIHRoZSBDVVJSRU5UXG4gICAqICB2YWx1ZSBvbiBzdWJzY3JpYmUsIHNvIHNraXAoMSkg4oCUIG9ubHkgYSByZWFsIHN3aXRjaCB0cmlnZ2VycyBpdFxuICAgKiAgKHRoZSBhY2NvdW50LXBhZ2UgaWRpb20pLiBVbnN1YnNjcmliZWQgaW4gbmdPbkRlc3Ryb3kuICovXG4gIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNkciA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhbGVTdWIgPSB0b09ic2VydmFibGUodGhpcy5pMThuLmxvY2FsZSlcbiAgICAucGlwZShza2lwKDEpKVxuICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5jZHIubWFya0ZvckNoZWNrKCkpO1xuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMubG9jYWxlU3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cbn1cbiIsIjxhcnRpY2xlIGNsYXNzPVwibGVnYWwtcGFnZVwiPlxuICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2xlZ2FsLnRlcm1zLnRpdGxlJyB8IHQgfX08L2gxPlxuICA8cCBjbGFzcz1cImxlZ2FsLXBhZ2VfX3VwZGF0ZWRcIj57eyAnbGVnYWwudGVybXMudXBkYXRlZCcgfCB0IH19PC9wPlxuXG4gIDxuYXYgY2xhc3M9XCJsZWdhbC1wYWdlX190b2NcIiBbYXR0ci5hcmlhLWxhYmVsXT1cIidsZWdhbC50b2MuYXJpYScgfCB0XCI+XG4gICAgPG9sPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cImFjY2VwdGFuY2VcIj57eyAnbGVnYWwudGVybXMuYWNjZXB0YW5jZScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwic2VydmljZVwiPnt7ICdsZWdhbC50ZXJtcy5zZXJ2aWNlJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3Rlcm1zXCIgZnJhZ21lbnQ9XCJlbGlnaWJpbGl0eVwiPnt7ICdsZWdhbC50ZXJtcy5lbGlnaWJpbGl0eScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwic2VjdXJpdHlcIj57eyAnbGVnYWwudGVybXMuc2VjdXJpdHknIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cInJ1bGVzXCI+e3sgJ2xlZ2FsLnRlcm1zLnJ1bGVzJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT5cbiAgICAgICAgPGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwicHJvaGliaXRlZFwiPnt7ICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkJyB8IHQgfX08L2E+XG4gICAgICA8L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cImxpY2Vuc2VcIj57eyAnbGVnYWwudGVybXMubGljZW5zZScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwibW9kZXJhdGlvblwiPnt7ICdsZWdhbC50ZXJtcy5tb2RlcmF0aW9uJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3Rlcm1zXCIgZnJhZ21lbnQ9XCJvZmZpY2lhbFwiPnt7ICdsZWdhbC50ZXJtcy5vZmZpY2lhbCcgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwiZW1lcmdlbmN5XCI+e3sgJ2xlZ2FsLnRlcm1zLmVtZXJnZW5jeScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi90ZXJtc1wiIGZyYWdtZW50PVwid2FycmFudHlcIj57eyAnbGVnYWwudGVybXMud2FycmFudHknIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cImxpYWJpbGl0eVwiPnt7ICdsZWdhbC50ZXJtcy5saWFiaWxpdHknIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPlxuICAgICAgICA8YSByb3V0ZXJMaW5rPVwiL3Rlcm1zXCIgZnJhZ21lbnQ9XCJ0aGlyZC1wYXJ0eVwiPnt7ICdsZWdhbC50ZXJtcy50aGlyZFBhcnR5JyB8IHQgfX08L2E+XG4gICAgICA8L2xpPlxuICAgICAgPGxpPlxuICAgICAgICA8YSByb3V0ZXJMaW5rPVwiL3Rlcm1zXCIgZnJhZ21lbnQ9XCJhdmFpbGFiaWxpdHlcIj57eyAnbGVnYWwudGVybXMuYXZhaWxhYmlsaXR5JyB8IHQgfX08L2E+XG4gICAgICA8L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cInNvdXJjZVwiPnt7ICdsZWdhbC50ZXJtcy5zb3VyY2UnIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cImxhd1wiPnt7ICdsZWdhbC50ZXJtcy5sYXcnIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvdGVybXNcIiBmcmFnbWVudD1cImNvbnRhY3RcIj57eyAnbGVnYWwudGVybXMuY29udGFjdCcgfCB0IH19PC9hPjwvbGk+XG4gICAgPC9vbD5cbiAgPC9uYXY+XG5cbiAgPHNlY3Rpb24gaWQ9XCJhY2NlcHRhbmNlXCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5hY2NlcHRhbmNlJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5hY2NlcHRhbmNlLnAxJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInNlcnZpY2VcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLnNlcnZpY2UnIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnRlcm1zLnNlcnZpY2UucDEnIHwgdCB9fTwvcD5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC50ZXJtcy5zZXJ2aWNlLnAyLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwudGVybXMuc2VydmljZS5wMi5zdHJvbmcnIHwgdFxuICAgICAgfX08L3N0cm9uZz57eyAnbGVnYWwudGVybXMuc2VydmljZS5wMi5taWRkbGUnIHwgdFxuICAgICAgfX08c3Ryb25nPnt7ICdsZWdhbC50ZXJtcy5lbWVyZ2VuY3lOdW1iZXInIHwgdCB9fTwvc3Ryb25nXG4gICAgICA+e3sgJ2xlZ2FsLnRlcm1zLnNlcnZpY2UucDIuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiZWxpZ2liaWxpdHlcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLmVsaWdpYmlsaXR5JyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5lbGlnaWJpbGl0eS5wMScgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJzZWN1cml0eVwiPlxuICAgIDxoMj57eyAnbGVnYWwudGVybXMuc2VjdXJpdHknIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnRlcm1zLnNlY3VyaXR5LnAxJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInJ1bGVzXCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5ydWxlcycgfCB0IH19PC9oMj5cbiAgICA8dWw+XG4gICAgICA8bGk+e3sgJ2xlZ2FsLnRlcm1zLnJ1bGVzLmxpMScgfCB0IH19PC9saT5cbiAgICAgIDxsaT57eyAnbGVnYWwudGVybXMucnVsZXMubGkyJyB8IHQgfX08L2xpPlxuICAgICAgPGxpPnt7ICdsZWdhbC50ZXJtcy5ydWxlcy5saTMnIHwgdCB9fTwvbGk+XG4gICAgICA8bGk+e3sgJ2xlZ2FsLnRlcm1zLnJ1bGVzLmxpNCcgfCB0IH19PC9saT5cbiAgICA8L3VsPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJwcm9oaWJpdGVkXCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkLnAxJyB8IHQgfX08L3A+XG4gICAgPHVsPlxuICAgICAgPGxpPnt7ICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkLmxpMScgfCB0IH19PC9saT5cbiAgICAgIDxsaT57eyAnbGVnYWwudGVybXMucHJvaGliaXRlZC5saTInIHwgdCB9fTwvbGk+XG4gICAgICA8bGk+e3sgJ2xlZ2FsLnRlcm1zLnByb2hpYml0ZWQubGkzJyB8IHQgfX08L2xpPlxuICAgICAgPGxpPnt7ICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkLmxpNCcgfCB0IH19PC9saT5cbiAgICAgIDxsaT57eyAnbGVnYWwudGVybXMucHJvaGliaXRlZC5saTUnIHwgdCB9fTwvbGk+XG4gICAgPC91bD5cbiAgICA8cD57eyAnbGVnYWwudGVybXMucHJvaGliaXRlZC5wMicgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJsaWNlbnNlXCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5saWNlbnNlJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5saWNlbnNlLnAxJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cIm1vZGVyYXRpb25cIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLm1vZGVyYXRpb24nIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnRlcm1zLm1vZGVyYXRpb24ucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwib2ZmaWNpYWxcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsJyB8IHQgfX08L2gyPlxuICAgIDxwPlxuICAgICAge3sgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsLnAxLmJlZm9yZScgfCB0IH19PGVtPnt7ICdsZWdhbC50ZXJtcy5vZmZpY2lhbC5wMS5lbScgfCB0XG4gICAgICB9fTwvZW0+e3sgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsLnAxLm1pZGRsZScgfCB0XG4gICAgICB9fTxzdHJvbmc+e3sgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsLnAxLnN0cm9uZycgfCB0IH19PC9zdHJvbmc+XG4gICAgPC9wPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5vZmZpY2lhbC5wMicgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJlbWVyZ2VuY3lcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLmVtZXJnZW5jeScgfCB0IH19PC9oMj5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC50ZXJtcy5lbWVyZ2VuY3kucDEuYmVmb3JlJyB8IHRcbiAgICAgIH19PHN0cm9uZz57eyAnbGVnYWwudGVybXMuZW1lcmdlbmN5TnVtYmVyJyB8IHQgfX08L3N0cm9uZ1xuICAgICAgPnt7ICdsZWdhbC50ZXJtcy5lbWVyZ2VuY3kucDEuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgICA8cD57eyAnbGVnYWwudGVybXMuZW1lcmdlbmN5LnAyJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cIndhcnJhbnR5XCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy53YXJyYW50eScgfCB0IH19PC9oMj5cbiAgICA8cD57eyAnbGVnYWwudGVybXMud2FycmFudHkucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwibGlhYmlsaXR5XCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5saWFiaWxpdHknIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnRlcm1zLmxpYWJpbGl0eS5wMScgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJ0aGlyZC1wYXJ0eVwiPlxuICAgIDxoMj57eyAnbGVnYWwudGVybXMudGhpcmRQYXJ0eScgfCB0IH19PC9oMj5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC50ZXJtcy50aGlyZFBhcnR5LnAxLmJlZm9yZScgfCB0XG4gICAgICB9fTxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiPnt7ICdsZWdhbC50ZXJtcy50aGlyZFBhcnR5LnAxLmxpbmsnIHwgdCB9fTwvYVxuICAgICAgPnt7ICdsZWdhbC50ZXJtcy50aGlyZFBhcnR5LnAxLmFmdGVyJyB8IHQgfX1cbiAgICA8L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cImF2YWlsYWJpbGl0eVwiPlxuICAgIDxoMj57eyAnbGVnYWwudGVybXMuYXZhaWxhYmlsaXR5JyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC50ZXJtcy5hdmFpbGFiaWxpdHkucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwic291cmNlXCI+XG4gICAgPGgyPnt7ICdsZWdhbC50ZXJtcy5zb3VyY2UnIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnRlcm1zLnNvdXJjZS5wMScgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJsYXdcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLmxhdycgfCB0IH19PC9oMj5cbiAgICA8cD57eyAnbGVnYWwudGVybXMubGF3LnAxJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cImNvbnRhY3RcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnRlcm1zLmNvbnRhY3QnIHwgdCB9fTwvaDI+XG4gICAgPHA+XG4gICAgICB7eyAnbGVnYWwudGVybXMuY29udGFjdC5wMS5iZWZvcmUnIHwgdFxuICAgICAgfX08YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIj57eyAnbGVnYWwudGVybXMuY29udGFjdC5wMS5saW5rJyB8IHQgfX08L2FcbiAgICAgID57eyAnbGVnYWwudGVybXMuY29udGFjdC5wMS5hZnRlcicgfCB0IH19XG4gICAgPC9wPlxuICA8L3NlY3Rpb24+XG48L2FydGljbGU+XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxTQUNFLHlCQUNBLG1CQUNBLFdBRUEsY0FDSztBQUNQLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsWUFBWTs7QUFrQmYsSUFBTyxZQUFQLE1BQU8sV0FBOEI7Ozs7O0VBS2hDLE9BQU8sT0FBTyxXQUFXO0VBQ2pCLE1BQU0sT0FBTyxpQkFBaUI7RUFFOUIsWUFBWSxhQUFhLEtBQUssS0FBSyxNQUFNLEVBQ3ZELEtBQUssS0FBSyxDQUFDLENBQUMsRUFDWixVQUFVLE1BQU0sS0FBSyxJQUFJLGFBQVksQ0FBRTtFQUUxQyxjQUFtQjtBQUNqQixTQUFLLFVBQVUsWUFBVztFQUM1Qjs7cUNBZFcsWUFBUztFQUFBOzRFQUFULFlBQVMsV0FBQSxDQUFBLENBQUEsZ0JBQUEsQ0FBQSxHQUFBLE9BQUEsS0FBQSxNQUFBLEtBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxZQUFBLEdBQUEsQ0FBQSxHQUFBLFlBQUEsR0FBQSxDQUFBLEdBQUEscUJBQUEsR0FBQSxDQUFBLEdBQUEsaUJBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFlBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFNBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLGFBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFVBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLE9BQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFlBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFNBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFlBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFVBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFdBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFVBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFdBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLGFBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLGNBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFFBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLEtBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxZQUFBLFNBQUEsR0FBQSxDQUFBLE1BQUEsWUFBQSxHQUFBLENBQUEsTUFBQSxTQUFBLEdBQUEsQ0FBQSxNQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsVUFBQSxHQUFBLENBQUEsTUFBQSxPQUFBLEdBQUEsQ0FBQSxNQUFBLFlBQUEsR0FBQSxDQUFBLE1BQUEsU0FBQSxHQUFBLENBQUEsTUFBQSxZQUFBLEdBQUEsQ0FBQSxNQUFBLFVBQUEsR0FBQSxDQUFBLE1BQUEsV0FBQSxHQUFBLENBQUEsTUFBQSxVQUFBLEdBQUEsQ0FBQSxNQUFBLFdBQUEsR0FBQSxDQUFBLE1BQUEsYUFBQSxHQUFBLENBQUEsY0FBQSxVQUFBLEdBQUEsQ0FBQSxNQUFBLGNBQUEsR0FBQSxDQUFBLE1BQUEsUUFBQSxHQUFBLENBQUEsTUFBQSxLQUFBLEdBQUEsQ0FBQSxNQUFB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QSxxQkFBQSxDQUFBO0FBSzVDLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLHdCQUFBLENBQUE7QUFDRCxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSwyQkFBQSxDQUFBO0FBSUMsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEscUJBQUEsQ0FBQTtBQUNELE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLHdCQUFBLENBQUE7QUFFRCxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLGdDQUFBLEtBQUEseUJBQUEsSUFBQSxLQUFBLCtCQUFBLENBQUE7QUFBaUQsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsK0JBQUEsQ0FBQTtBQUN0QyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSwrQkFBQSxDQUFBO0FBQ0QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsNkJBQUEsQ0FBQTtBQUNULE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsZ0NBQUEsSUFBQSx5QkFBQSxLQUFBLEtBQUEsOEJBQUEsR0FBQSxHQUFBO0FBS0MsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEseUJBQUEsQ0FBQTtBQUNELE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLDRCQUFBLENBQUE7QUFJQyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSxzQkFBQSxDQUFBO0FBQ0QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEseUJBQUEsQ0FBQTtBQUlDLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLG1CQUFBLENBQUE7QUFFRSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSx1QkFBQSxDQUFBO0FBQ0EsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsdUJBQUEsQ0FBQTtBQUNBLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLHVCQUFBLENBQUE7QUFDQSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSx1QkFBQSxDQUFBO0FBS0YsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsd0JBQUEsQ0FBQTtBQUNELE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLDJCQUFBLENBQUE7QUFFRyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw0QkFBQSxDQUFBO0FBQ0EsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsNEJBQUEsQ0FBQTtBQUNBLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLDRCQUFBLENBQUE7QUFDQSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw0QkFBQSxDQUFBO0FBQ0EsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsNEJBQUEsQ0FBQTtBQUVILE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLDJCQUFBLENBQUE7QUFJQyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSxxQkFBQSxDQUFBO0FBQ0QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFB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