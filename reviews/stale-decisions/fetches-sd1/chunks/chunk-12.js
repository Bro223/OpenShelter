import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-LRSYTSHE.js");import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/legal/privacy-policy-page.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var PrivacyPolicyPage = class _PrivacyPolicyPage {
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
  static \u0275fac = function PrivacyPolicyPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PrivacyPolicyPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _PrivacyPolicyPage, selectors: [["app-privacy-policy-page"]], decls: 448, vars: 435, consts: [[1, "legal-page"], [1, "page-title"], [1, "legal-page__updated"], [1, "legal-page__toc"], ["routerLink", "/privacy", "fragment", "who"], ["routerLink", "/privacy", "fragment", "scope"], ["routerLink", "/privacy", "fragment", "collect"], ["routerLink", "/privacy", "fragment", "why"], ["routerLink", "/privacy", "fragment", "verification"], ["routerLink", "/privacy", "fragment", "location"], ["routerLink", "/privacy", "fragment", "content"], ["routerLink", "/privacy", "fragment", "cookies"], ["routerLink", "/privacy", "fragment", "third-parties"], ["routerLink", "/privacy", "fragment", "sharing"], ["routerLink", "/privacy", "fragment", "retention"], ["routerLink", "/privacy", "fragment", "rights"], ["routerLink", "/privacy", "fragment", "security"], ["routerLink", "/privacy", "fragment", "children"], ["routerLink", "/privacy", "fragment", "changes"], ["routerLink", "/privacy", "fragment", "contact"], ["id", "who"], ["id", "scope"], ["id", "collect"], ["id", "why"], ["id", "verification"], ["id", "location"], ["id", "content"], ["routerLink", "/account"], ["id", "cookies"], ["id", "third-parties"], ["id", "sharing"], ["id", "retention"], ["id", "rights"], ["id", "security"], ["id", "children"], ["id", "changes"], ["id", "contact"], ["routerLink", "/terms"]], template: function PrivacyPolicyPage_Template(rf, ctx) {
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
      i0.\u0275\u0275elementEnd()()()();
      i0.\u0275\u0275elementStart(74, "section", 20)(75, "h2");
      i0.\u0275\u0275text(76);
      i0.\u0275\u0275pipe(77, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(78, "p");
      i0.\u0275\u0275text(79);
      i0.\u0275\u0275pipe(80, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(81, "p");
      i0.\u0275\u0275text(82);
      i0.\u0275\u0275pipe(83, "t");
      i0.\u0275\u0275elementStart(84, "strong");
      i0.\u0275\u0275text(85);
      i0.\u0275\u0275pipe(86, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(87);
      i0.\u0275\u0275pipe(88, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(89, "section", 21)(90, "h2");
      i0.\u0275\u0275text(91);
      i0.\u0275\u0275pipe(92, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(93, "p");
      i0.\u0275\u0275text(94);
      i0.\u0275\u0275pipe(95, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(96, "section", 22)(97, "h2");
      i0.\u0275\u0275text(98);
      i0.\u0275\u0275pipe(99, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(100, "p");
      i0.\u0275\u0275text(101);
      i0.\u0275\u0275pipe(102, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(103, "ul")(104, "li");
      i0.\u0275\u0275text(105);
      i0.\u0275\u0275pipe(106, "t");
      i0.\u0275\u0275elementStart(107, "strong");
      i0.\u0275\u0275text(108);
      i0.\u0275\u0275pipe(109, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(110);
      i0.\u0275\u0275pipe(111, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(112, "li");
      i0.\u0275\u0275text(113);
      i0.\u0275\u0275pipe(114, "t");
      i0.\u0275\u0275elementStart(115, "strong");
      i0.\u0275\u0275text(116);
      i0.\u0275\u0275pipe(117, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(118);
      i0.\u0275\u0275pipe(119, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(120, "li");
      i0.\u0275\u0275text(121);
      i0.\u0275\u0275pipe(122, "t");
      i0.\u0275\u0275elementStart(123, "strong");
      i0.\u0275\u0275text(124);
      i0.\u0275\u0275pipe(125, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(126);
      i0.\u0275\u0275pipe(127, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(128, "li");
      i0.\u0275\u0275text(129);
      i0.\u0275\u0275pipe(130, "t");
      i0.\u0275\u0275elementStart(131, "strong");
      i0.\u0275\u0275text(132);
      i0.\u0275\u0275pipe(133, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(134);
      i0.\u0275\u0275pipe(135, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(136, "p");
      i0.\u0275\u0275text(137);
      i0.\u0275\u0275pipe(138, "t");
      i0.\u0275\u0275elementStart(139, "strong");
      i0.\u0275\u0275text(140);
      i0.\u0275\u0275pipe(141, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(142);
      i0.\u0275\u0275pipe(143, "t");
      i0.\u0275\u0275elementStart(144, "a", 10);
      i0.\u0275\u0275text(145);
      i0.\u0275\u0275pipe(146, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(147);
      i0.\u0275\u0275pipe(148, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(149, "section", 23)(150, "h2");
      i0.\u0275\u0275text(151);
      i0.\u0275\u0275pipe(152, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(153, "p");
      i0.\u0275\u0275text(154);
      i0.\u0275\u0275pipe(155, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(156, "ul")(157, "li")(158, "strong");
      i0.\u0275\u0275text(159);
      i0.\u0275\u0275pipe(160, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(161);
      i0.\u0275\u0275pipe(162, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(163, "li")(164, "strong");
      i0.\u0275\u0275text(165);
      i0.\u0275\u0275pipe(166, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(167);
      i0.\u0275\u0275pipe(168, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(169, "li")(170, "strong");
      i0.\u0275\u0275text(171);
      i0.\u0275\u0275pipe(172, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(173);
      i0.\u0275\u0275pipe(174, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(175, "li")(176, "strong");
      i0.\u0275\u0275text(177);
      i0.\u0275\u0275pipe(178, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(179);
      i0.\u0275\u0275pipe(180, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(181, "li")(182, "strong");
      i0.\u0275\u0275text(183);
      i0.\u0275\u0275pipe(184, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(185);
      i0.\u0275\u0275pipe(186, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(187, "p");
      i0.\u0275\u0275text(188);
      i0.\u0275\u0275pipe(189, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(190, "section", 24)(191, "h2");
      i0.\u0275\u0275text(192);
      i0.\u0275\u0275pipe(193, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(194, "p");
      i0.\u0275\u0275text(195);
      i0.\u0275\u0275pipe(196, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(197, "p");
      i0.\u0275\u0275text(198);
      i0.\u0275\u0275pipe(199, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(200, "p");
      i0.\u0275\u0275text(201);
      i0.\u0275\u0275pipe(202, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(203, "section", 25)(204, "h2");
      i0.\u0275\u0275text(205);
      i0.\u0275\u0275pipe(206, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(207, "p");
      i0.\u0275\u0275text(208);
      i0.\u0275\u0275pipe(209, "t");
      i0.\u0275\u0275elementStart(210, "em");
      i0.\u0275\u0275text(211);
      i0.\u0275\u0275pipe(212, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(213);
      i0.\u0275\u0275pipe(214, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(215, "p");
      i0.\u0275\u0275text(216);
      i0.\u0275\u0275pipe(217, "t");
      i0.\u0275\u0275elementStart(218, "strong");
      i0.\u0275\u0275text(219);
      i0.\u0275\u0275pipe(220, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(221);
      i0.\u0275\u0275pipe(222, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(223, "p");
      i0.\u0275\u0275text(224);
      i0.\u0275\u0275pipe(225, "t");
      i0.\u0275\u0275elementStart(226, "strong");
      i0.\u0275\u0275text(227);
      i0.\u0275\u0275pipe(228, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(229);
      i0.\u0275\u0275pipe(230, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(231, "section", 26)(232, "h2");
      i0.\u0275\u0275text(233);
      i0.\u0275\u0275pipe(234, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(235, "p");
      i0.\u0275\u0275text(236);
      i0.\u0275\u0275pipe(237, "t");
      i0.\u0275\u0275elementStart(238, "a", 27);
      i0.\u0275\u0275text(239);
      i0.\u0275\u0275pipe(240, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(241);
      i0.\u0275\u0275pipe(242, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(243, "p");
      i0.\u0275\u0275text(244);
      i0.\u0275\u0275pipe(245, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(246, "section", 28)(247, "h2");
      i0.\u0275\u0275text(248);
      i0.\u0275\u0275pipe(249, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(250, "p");
      i0.\u0275\u0275text(251);
      i0.\u0275\u0275pipe(252, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(253, "ul")(254, "li");
      i0.\u0275\u0275text(255);
      i0.\u0275\u0275pipe(256, "t");
      i0.\u0275\u0275elementStart(257, "strong");
      i0.\u0275\u0275text(258);
      i0.\u0275\u0275pipe(259, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(260);
      i0.\u0275\u0275pipe(261, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(262, "li");
      i0.\u0275\u0275text(263);
      i0.\u0275\u0275pipe(264, "t");
      i0.\u0275\u0275elementStart(265, "strong");
      i0.\u0275\u0275text(266);
      i0.\u0275\u0275pipe(267, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(268);
      i0.\u0275\u0275pipe(269, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(270, "li");
      i0.\u0275\u0275text(271);
      i0.\u0275\u0275pipe(272, "t");
      i0.\u0275\u0275elementStart(273, "strong");
      i0.\u0275\u0275text(274);
      i0.\u0275\u0275pipe(275, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(276);
      i0.\u0275\u0275pipe(277, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(278, "p");
      i0.\u0275\u0275text(279);
      i0.\u0275\u0275pipe(280, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(281, "section", 29)(282, "h2");
      i0.\u0275\u0275text(283);
      i0.\u0275\u0275pipe(284, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(285, "p");
      i0.\u0275\u0275text(286);
      i0.\u0275\u0275pipe(287, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(288, "ul")(289, "li");
      i0.\u0275\u0275text(290);
      i0.\u0275\u0275pipe(291, "t");
      i0.\u0275\u0275elementStart(292, "strong");
      i0.\u0275\u0275text(293);
      i0.\u0275\u0275pipe(294, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(295);
      i0.\u0275\u0275pipe(296, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(297, "li");
      i0.\u0275\u0275text(298);
      i0.\u0275\u0275pipe(299, "t");
      i0.\u0275\u0275elementStart(300, "strong");
      i0.\u0275\u0275text(301);
      i0.\u0275\u0275pipe(302, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(303);
      i0.\u0275\u0275pipe(304, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(305, "li")(306, "strong");
      i0.\u0275\u0275text(307);
      i0.\u0275\u0275pipe(308, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(309);
      i0.\u0275\u0275pipe(310, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(311, "p");
      i0.\u0275\u0275text(312);
      i0.\u0275\u0275pipe(313, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(314, "section", 30)(315, "h2");
      i0.\u0275\u0275text(316);
      i0.\u0275\u0275pipe(317, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(318, "p");
      i0.\u0275\u0275text(319);
      i0.\u0275\u0275pipe(320, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(321, "section", 31)(322, "h2");
      i0.\u0275\u0275text(323);
      i0.\u0275\u0275pipe(324, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(325, "p");
      i0.\u0275\u0275text(326);
      i0.\u0275\u0275pipe(327, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(328, "p");
      i0.\u0275\u0275text(329);
      i0.\u0275\u0275pipe(330, "t");
      i0.\u0275\u0275elementStart(331, "strong");
      i0.\u0275\u0275text(332);
      i0.\u0275\u0275pipe(333, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(334);
      i0.\u0275\u0275pipe(335, "t");
      i0.\u0275\u0275elementStart(336, "strong");
      i0.\u0275\u0275text(337);
      i0.\u0275\u0275pipe(338, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(339);
      i0.\u0275\u0275pipe(340, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(341, "p");
      i0.\u0275\u0275text(342);
      i0.\u0275\u0275pipe(343, "t");
      i0.\u0275\u0275elementStart(344, "code");
      i0.\u0275\u0275text(345);
      i0.\u0275\u0275pipe(346, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(347);
      i0.\u0275\u0275pipe(348, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(349, "p");
      i0.\u0275\u0275text(350);
      i0.\u0275\u0275pipe(351, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(352, "section", 32)(353, "h2");
      i0.\u0275\u0275text(354);
      i0.\u0275\u0275pipe(355, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(356, "p");
      i0.\u0275\u0275text(357);
      i0.\u0275\u0275pipe(358, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(359, "ul")(360, "li")(361, "strong");
      i0.\u0275\u0275text(362);
      i0.\u0275\u0275pipe(363, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(364);
      i0.\u0275\u0275pipe(365, "t");
      i0.\u0275\u0275elementStart(366, "strong");
      i0.\u0275\u0275text(367);
      i0.\u0275\u0275pipe(368, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(369);
      i0.\u0275\u0275pipe(370, "t");
      i0.\u0275\u0275elementStart(371, "a", 27);
      i0.\u0275\u0275text(372);
      i0.\u0275\u0275pipe(373, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(374);
      i0.\u0275\u0275pipe(375, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(376, "li")(377, "strong");
      i0.\u0275\u0275text(378);
      i0.\u0275\u0275pipe(379, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(380);
      i0.\u0275\u0275pipe(381, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(382, "li")(383, "strong");
      i0.\u0275\u0275text(384);
      i0.\u0275\u0275pipe(385, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(386);
      i0.\u0275\u0275pipe(387, "t");
      i0.\u0275\u0275elementStart(388, "a", 27);
      i0.\u0275\u0275text(389);
      i0.\u0275\u0275pipe(390, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(391);
      i0.\u0275\u0275pipe(392, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(393, "li")(394, "strong");
      i0.\u0275\u0275text(395);
      i0.\u0275\u0275pipe(396, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(397);
      i0.\u0275\u0275pipe(398, "t");
      i0.\u0275\u0275elementStart(399, "strong");
      i0.\u0275\u0275text(400);
      i0.\u0275\u0275pipe(401, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(402);
      i0.\u0275\u0275pipe(403, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(404, "p");
      i0.\u0275\u0275text(405);
      i0.\u0275\u0275pipe(406, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(407, "section", 33)(408, "h2");
      i0.\u0275\u0275text(409);
      i0.\u0275\u0275pipe(410, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(411, "p");
      i0.\u0275\u0275text(412);
      i0.\u0275\u0275pipe(413, "t");
      i0.\u0275\u0275elementStart(414, "strong");
      i0.\u0275\u0275text(415);
      i0.\u0275\u0275pipe(416, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(417);
      i0.\u0275\u0275pipe(418, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(419, "p");
      i0.\u0275\u0275text(420);
      i0.\u0275\u0275pipe(421, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(422, "section", 34)(423, "h2");
      i0.\u0275\u0275text(424);
      i0.\u0275\u0275pipe(425, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(426, "p");
      i0.\u0275\u0275text(427);
      i0.\u0275\u0275pipe(428, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(429, "section", 35)(430, "h2");
      i0.\u0275\u0275text(431);
      i0.\u0275\u0275pipe(432, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(433, "p");
      i0.\u0275\u0275text(434);
      i0.\u0275\u0275pipe(435, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(436, "section", 36)(437, "h2");
      i0.\u0275\u0275text(438);
      i0.\u0275\u0275pipe(439, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(440, "p");
      i0.\u0275\u0275text(441);
      i0.\u0275\u0275pipe(442, "t");
      i0.\u0275\u0275elementStart(443, "a", 37);
      i0.\u0275\u0275text(444);
      i0.\u0275\u0275pipe(445, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275text(446);
      i0.\u0275\u0275pipe(447, "t");
      i0.\u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 145, "legal.privacy.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(6, 147, "legal.privacy.updated"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(8, 149, "legal.toc.aria"));
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(13, 151, "legal.privacy.who"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(17, 153, "legal.privacy.scope"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(21, 155, "legal.privacy.collect"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(25, 157, "legal.privacy.why"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(29, 159, "legal.privacy.verification"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(33, 161, "legal.privacy.location"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(37, 163, "legal.privacy.content"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(41, 165, "legal.privacy.cookies"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(45, 167, "legal.privacy.thirdParties"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(49, 169, "legal.privacy.sharing"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(53, 171, "legal.privacy.retention"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(57, 173, "legal.privacy.rights"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(61, 175, "legal.privacy.security"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(65, 177, "legal.privacy.children"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(69, 179, "legal.privacy.changes"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(73, 181, "legal.privacy.contact"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(77, 183, "legal.privacy.who"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(80, 185, "legal.privacy.who.p1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(83, 187, "legal.privacy.who.p2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(86, 189, "legal.privacy.who.p2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(88, 191, "legal.privacy.who.p2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(92, 193, "legal.privacy.scope"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(95, 195, "legal.privacy.scope.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(99, 197, "legal.privacy.collect"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(102, 199, "legal.privacy.collect.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(106, 201, "legal.privacy.collect.li1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(109, 203, "legal.privacy.collect.li1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(111, 205, "legal.privacy.collect.li1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(114, 207, "legal.privacy.collect.li2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(117, 209, "legal.privacy.collect.li2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(119, 211, "legal.privacy.collect.li2.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(122, 213, "legal.privacy.collect.li3.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(125, 215, "legal.privacy.collect.li3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(127, 217, "legal.privacy.collect.li3.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(130, 219, "legal.privacy.collect.li4.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(133, 221, "legal.privacy.collect.li4.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(135, 223, "legal.privacy.collect.li4.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(138, 225, "legal.privacy.collect.p2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(141, 227, "legal.privacy.collect.p2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(143, 229, "legal.privacy.collect.p2.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(146, 231, "legal.privacy.collect.p2.link"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(148, 233, "legal.privacy.collect.p2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(152, 235, "legal.privacy.why"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(155, 237, "legal.privacy.why.p1"));
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(160, 239, "legal.privacy.why.li1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(162, 241, "legal.privacy.why.li1.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(166, 243, "legal.privacy.why.li2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(168, 245, "legal.privacy.why.li2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(172, 247, "legal.privacy.why.li3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(174, 249, "legal.privacy.why.li3.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(178, 251, "legal.privacy.why.li4.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(180, 253, "legal.privacy.why.li4.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(184, 255, "legal.privacy.why.li5.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(186, 257, "legal.privacy.why.li5.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(189, 259, "legal.privacy.why.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(193, 261, "legal.privacy.verification"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(196, 263, "legal.privacy.verification.p1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(199, 265, "legal.privacy.verification.p2"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(202, 267, "legal.privacy.verification.p3"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(206, 269, "legal.privacy.location"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(209, 271, "legal.privacy.location.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(212, 273, "legal.privacy.location.p1.em"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(214, 275, "legal.privacy.location.p1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(217, 277, "legal.privacy.location.p2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(220, 279, "legal.privacy.location.p2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(222, 281, "legal.privacy.location.p2.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(225, 283, "legal.privacy.location.p3.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(228, 285, "legal.privacy.location.p3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(230, 287, "legal.privacy.location.p3.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(234, 289, "legal.privacy.content"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(237, 291, "legal.privacy.content.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(240, 293, "legal.privacy.link.accountPage"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(242, 295, "legal.privacy.content.p1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(245, 297, "legal.privacy.content.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(249, 299, "legal.privacy.cookies"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(252, 301, "legal.privacy.cookies.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(256, 303, "legal.privacy.cookies.li1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(259, 305, "legal.privacy.cookies.li1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(261, 307, "legal.privacy.cookies.li1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(264, 309, "legal.privacy.cookies.li2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(267, 311, "legal.privacy.cookies.li2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(269, 313, "legal.privacy.cookies.li2.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(272, 315, "legal.privacy.cookies.li3.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(275, 317, "legal.privacy.cookies.li3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(277, 319, "legal.privacy.cookies.li3.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(280, 321, "legal.privacy.cookies.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(284, 323, "legal.privacy.thirdParties"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(287, 325, "legal.privacy.thirdParties.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(291, 327, "legal.privacy.thirdParties.li1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(294, 329, "legal.privacy.thirdParties.li1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(296, 331, "legal.privacy.thirdParties.li1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(299, 333, "legal.privacy.thirdParties.li2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(302, 335, "legal.privacy.thirdParties.li2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(304, 337, "legal.privacy.thirdParties.li2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(308, 339, "legal.privacy.thirdParties.li3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(310, 341, "legal.privacy.thirdParties.li3.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(313, 343, "legal.privacy.thirdParties.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(317, 345, "legal.privacy.sharing"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(320, 347, "legal.privacy.sharing.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(324, 349, "legal.privacy.retention"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(327, 351, "legal.privacy.retention.p1"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(330, 353, "legal.privacy.retention.p2.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(333, 355, "legal.privacy.retention.p2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(335, 357, "legal.privacy.retention.p2.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(338, 359, "legal.privacy.retention.p2.strong2"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(340, 361, "legal.privacy.retention.p2.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(343, 363, "legal.privacy.retention.p3.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(346, 365, "legal.privacy.retention.p3.code"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(348, 367, "legal.privacy.retention.p3.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(351, 369, "legal.privacy.retention.p4"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(355, 371, "legal.privacy.rights"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(358, 373, "legal.privacy.rights.p1"));
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(363, 375, "legal.privacy.rights.li1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(365, 377, "legal.privacy.rights.li1.and"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(368, 379, "legal.privacy.rights.li1.strong2"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(370, 381, "legal.privacy.rights.li1.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(373, 383, "legal.privacy.link.accountPage"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(375, 385, "legal.privacy.rights.li1.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(379, 387, "legal.privacy.rights.li2.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(381, 389, "legal.privacy.rights.li2.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(385, 391, "legal.privacy.rights.li3.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(387, 393, "legal.privacy.rights.li3.middle"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(390, 395, "legal.privacy.link.accountPage"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(392, 397, "legal.privacy.rights.li3.after"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(396, 399, "legal.privacy.rights.li4.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(398, 401, "legal.privacy.rights.li4.and"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(401, 403, "legal.privacy.rights.li4.strong2"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(403, 405, "legal.privacy.rights.li4.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(406, 407, "legal.privacy.rights.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(410, 409, "legal.privacy.security"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(413, 411, "legal.privacy.security.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(416, 413, "legal.privacy.security.p1.strong"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(418, 415, "legal.privacy.security.p1.after"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(421, 417, "legal.privacy.security.p2"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(425, 419, "legal.privacy.children"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(428, 421, "legal.privacy.children.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(432, 423, "legal.privacy.changes"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(435, 425, "legal.privacy.changes.p1"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(439, 427, "legal.privacy.contact"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(442, 429, "legal.privacy.contact.p1.before"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(445, 431, "legal.privacy.link.terms"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate1("", i0.\u0275\u0275pipeBind1(447, 433, "legal.privacy.contact.p1.after"), " ");
    }
  }, dependencies: [RouterLink, TranslatePipe], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.legal-page[_ngcontent-%COMP%] {\n  max-width: 46rem;\n  margin: var(--%NS%space-32) auto 0;\n  padding: 0 var(--%NS%space-16) var(--%NS%space-32);\n}\n.legal-page[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-24);\n}\n.legal-page[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-lg);\n}\n.legal-page[_ngcontent-%COMP%]   p[_ngcontent-%COMP%], \n.legal-page[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n}\n.legal-page[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  padding-left: var(--%NS%space-16);\n  list-style: disc;\n}\n.legal-page[_ngcontent-%COMP%] {\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__updated[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: 0 0 var(--%NS%space-20);\n}\n.legal-page[_ngcontent-%COMP%] {\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__toc[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  background: var(--%NS%color-bg-subtle);\n  padding: var(--%NS%space-16) var(--%NS%space-20);\n  margin: 0 0 var(--%NS%space-24);\n}\n.legal-page[_ngcontent-%COMP%]   .legal-page__toc[_ngcontent-%COMP%]   ol[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-left: var(--%NS%space-16);\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-6);\n}\n/*# sourceMappingURL=privacy-policy-page.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(PrivacyPolicyPage, [{
    type: Component,
    args: [{ selector: "app-privacy-policy-page", imports: [RouterLink, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<article class="legal-page">
  <h1 class="page-title">{{ 'legal.privacy.title' | t }}</h1>
  <p class="legal-page__updated">{{ 'legal.privacy.updated' | t }}</p>

  <nav class="legal-page__toc" [attr.aria-label]="'legal.toc.aria' | t">
    <ol>
      <li><a routerLink="/privacy" fragment="who">{{ 'legal.privacy.who' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="scope">{{ 'legal.privacy.scope' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="collect">{{ 'legal.privacy.collect' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="why">{{ 'legal.privacy.why' | t }}</a></li>
      <li>
        <a routerLink="/privacy" fragment="verification">{{ 'legal.privacy.verification' | t }}</a>
      </li>
      <li><a routerLink="/privacy" fragment="location">{{ 'legal.privacy.location' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="content">{{ 'legal.privacy.content' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="cookies">{{ 'legal.privacy.cookies' | t }}</a></li>
      <li>
        <a routerLink="/privacy" fragment="third-parties">{{ 'legal.privacy.thirdParties' | t }}</a>
      </li>
      <li><a routerLink="/privacy" fragment="sharing">{{ 'legal.privacy.sharing' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="retention">{{ 'legal.privacy.retention' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="rights">{{ 'legal.privacy.rights' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="security">{{ 'legal.privacy.security' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="children">{{ 'legal.privacy.children' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="changes">{{ 'legal.privacy.changes' | t }}</a></li>
      <li><a routerLink="/privacy" fragment="contact">{{ 'legal.privacy.contact' | t }}</a></li>
    </ol>
  </nav>

  <section id="who">
    <h2>{{ 'legal.privacy.who' | t }}</h2>
    <p>{{ 'legal.privacy.who.p1' | t }}</p>
    <p>
      {{ 'legal.privacy.who.p2.before' | t }}<strong>{{ 'legal.privacy.who.p2.strong' | t
      }}</strong>{{ 'legal.privacy.who.p2.after' | t }}
    </p>
  </section>

  <section id="scope">
    <h2>{{ 'legal.privacy.scope' | t }}</h2>
    <p>{{ 'legal.privacy.scope.p1' | t }}</p>
  </section>

  <section id="collect">
    <h2>{{ 'legal.privacy.collect' | t }}</h2>
    <p>{{ 'legal.privacy.collect.p1' | t }}</p>
    <ul>
      <li>
        {{ 'legal.privacy.collect.li1.before' | t }}<strong>{{ 'legal.privacy.collect.li1.strong' | t
        }}</strong>{{ 'legal.privacy.collect.li1.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.collect.li2.before' | t }}<strong>{{ 'legal.privacy.collect.li2.strong' | t
        }}</strong>{{ 'legal.privacy.collect.li2.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.collect.li3.before' | t }}<strong>{{ 'legal.privacy.collect.li3.strong' | t
        }}</strong>{{ 'legal.privacy.collect.li3.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.collect.li4.before' | t }}<strong>{{ 'legal.privacy.collect.li4.strong' | t
        }}</strong>{{ 'legal.privacy.collect.li4.after' | t }}
      </li>
    </ul>
    <p>
      {{ 'legal.privacy.collect.p2.before' | t }}<strong>{{ 'legal.privacy.collect.p2.strong' | t
      }}</strong>{{ 'legal.privacy.collect.p2.middle' | t
      }}<a routerLink="/privacy" fragment="content">{{ 'legal.privacy.collect.p2.link' | t }}</a
      >{{ 'legal.privacy.collect.p2.after' | t }}
    </p>
  </section>

  <section id="why">
    <h2>{{ 'legal.privacy.why' | t }}</h2>
    <p>{{ 'legal.privacy.why.p1' | t }}</p>
    <ul>
      <li>
        <strong>{{ 'legal.privacy.why.li1.strong' | t }}</strong
        >{{ 'legal.privacy.why.li1.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.why.li2.strong' | t }}</strong
        >{{ 'legal.privacy.why.li2.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.why.li3.strong' | t }}</strong
        >{{ 'legal.privacy.why.li3.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.why.li4.strong' | t }}</strong
        >{{ 'legal.privacy.why.li4.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.why.li5.strong' | t }}</strong
        >{{ 'legal.privacy.why.li5.after' | t }}
      </li>
    </ul>
    <p>{{ 'legal.privacy.why.p2' | t }}</p>
  </section>

  <section id="verification">
    <h2>{{ 'legal.privacy.verification' | t }}</h2>
    <p>{{ 'legal.privacy.verification.p1' | t }}</p>
    <p>{{ 'legal.privacy.verification.p2' | t }}</p>
    <p>{{ 'legal.privacy.verification.p3' | t }}</p>
  </section>

  <section id="location">
    <h2>{{ 'legal.privacy.location' | t }}</h2>
    <p>
      {{ 'legal.privacy.location.p1.before' | t }}<em>{{ 'legal.privacy.location.p1.em' | t
      }}</em>{{ 'legal.privacy.location.p1.after' | t }}
    </p>
    <p>
      {{ 'legal.privacy.location.p2.before' | t }}<strong>{{ 'legal.privacy.location.p2.strong' | t
      }}</strong>{{ 'legal.privacy.location.p2.after' | t }}
    </p>
    <p>
      {{ 'legal.privacy.location.p3.before' | t }}<strong>{{ 'legal.privacy.location.p3.strong' | t
      }}</strong>{{ 'legal.privacy.location.p3.after' | t }}
    </p>
  </section>

  <section id="content">
    <h2>{{ 'legal.privacy.content' | t }}</h2>
    <p>
      {{ 'legal.privacy.content.p1.before' | t
      }}<a routerLink="/account">{{ 'legal.privacy.link.accountPage' | t }}</a
      >{{ 'legal.privacy.content.p1.after' | t }}
    </p>
    <p>{{ 'legal.privacy.content.p2' | t }}</p>
  </section>

  <section id="cookies">
    <h2>{{ 'legal.privacy.cookies' | t }}</h2>
    <p>{{ 'legal.privacy.cookies.p1' | t }}</p>
    <ul>
      <li>
        {{ 'legal.privacy.cookies.li1.before' | t }}<strong>{{ 'legal.privacy.cookies.li1.strong' | t
        }}</strong>{{ 'legal.privacy.cookies.li1.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.cookies.li2.before' | t }}<strong>{{ 'legal.privacy.cookies.li2.strong' | t
        }}</strong>{{ 'legal.privacy.cookies.li2.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.cookies.li3.before' | t }}<strong>{{ 'legal.privacy.cookies.li3.strong' | t
        }}</strong>{{ 'legal.privacy.cookies.li3.after' | t }}
      </li>
    </ul>
    <p>{{ 'legal.privacy.cookies.p2' | t }}</p>
  </section>

  <section id="third-parties">
    <h2>{{ 'legal.privacy.thirdParties' | t }}</h2>
    <p>{{ 'legal.privacy.thirdParties.p1' | t }}</p>
    <ul>
      <li>
        {{ 'legal.privacy.thirdParties.li1.before' | t
        }}<strong>{{ 'legal.privacy.thirdParties.li1.strong' | t }}</strong
        >{{ 'legal.privacy.thirdParties.li1.after' | t }}
      </li>
      <li>
        {{ 'legal.privacy.thirdParties.li2.before' | t
        }}<strong>{{ 'legal.privacy.thirdParties.li2.strong' | t }}</strong
        >{{ 'legal.privacy.thirdParties.li2.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.thirdParties.li3.strong' | t }}</strong
        >{{ 'legal.privacy.thirdParties.li3.after' | t }}
      </li>
    </ul>
    <p>{{ 'legal.privacy.thirdParties.p2' | t }}</p>
  </section>

  <section id="sharing">
    <h2>{{ 'legal.privacy.sharing' | t }}</h2>
    <p>{{ 'legal.privacy.sharing.p1' | t }}</p>
  </section>

  <section id="retention">
    <h2>{{ 'legal.privacy.retention' | t }}</h2>
    <p>{{ 'legal.privacy.retention.p1' | t }}</p>
    <p>
      {{ 'legal.privacy.retention.p2.before' | t }}<strong>{{ 'legal.privacy.retention.p2.strong' | t
      }}</strong>{{ 'legal.privacy.retention.p2.middle' | t
      }}<strong>{{ 'legal.privacy.retention.p2.strong2' | t }}</strong
      >{{ 'legal.privacy.retention.p2.after' | t }}
    </p>
    <p>
      {{ 'legal.privacy.retention.p3.before' | t
      }}<code>{{ 'legal.privacy.retention.p3.code' | t }}</code
      >{{ 'legal.privacy.retention.p3.after' | t }}
    </p>
    <p>{{ 'legal.privacy.retention.p4' | t }}</p>
  </section>

  <section id="rights">
    <h2>{{ 'legal.privacy.rights' | t }}</h2>
    <p>{{ 'legal.privacy.rights.p1' | t }}</p>
    <ul>
      <li>
        <strong>{{ 'legal.privacy.rights.li1.strong' | t }}</strong
        >{{ 'legal.privacy.rights.li1.and' | t }}<strong>{{ 'legal.privacy.rights.li1.strong2' | t
        }}</strong>{{ 'legal.privacy.rights.li1.middle' | t
        }}<a routerLink="/account">{{ 'legal.privacy.link.accountPage' | t }}</a
        >{{ 'legal.privacy.rights.li1.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.rights.li2.strong' | t }}</strong
        >{{ 'legal.privacy.rights.li2.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.rights.li3.strong' | t }}</strong
        >{{ 'legal.privacy.rights.li3.middle' | t
        }}<a routerLink="/account">{{ 'legal.privacy.link.accountPage' | t }}</a
        >{{ 'legal.privacy.rights.li3.after' | t }}
      </li>
      <li>
        <strong>{{ 'legal.privacy.rights.li4.strong' | t }}</strong
        >{{ 'legal.privacy.rights.li4.and' | t }}<strong>{{ 'legal.privacy.rights.li4.strong2' | t
        }}</strong>{{ 'legal.privacy.rights.li4.after' | t }}
      </li>
    </ul>
    <p>{{ 'legal.privacy.rights.p2' | t }}</p>
  </section>

  <section id="security">
    <h2>{{ 'legal.privacy.security' | t }}</h2>
    <p>
      {{ 'legal.privacy.security.p1.before' | t
      }}<strong>{{ 'legal.privacy.security.p1.strong' | t }}</strong
      >{{ 'legal.privacy.security.p1.after' | t }}
    </p>
    <p>{{ 'legal.privacy.security.p2' | t }}</p>
  </section>

  <section id="children">
    <h2>{{ 'legal.privacy.children' | t }}</h2>
    <p>{{ 'legal.privacy.children.p1' | t }}</p>
  </section>

  <section id="changes">
    <h2>{{ 'legal.privacy.changes' | t }}</h2>
    <p>{{ 'legal.privacy.changes.p1' | t }}</p>
  </section>

  <section id="contact">
    <h2>{{ 'legal.privacy.contact' | t }}</h2>
    <p>
      {{ 'legal.privacy.contact.p1.before' | t
      }}<a routerLink="/terms">{{ 'legal.privacy.link.terms' | t }}</a
      >{{ 'legal.privacy.contact.p1.after' | t }}
    </p>
  </section>
</article>
`, styles: ["/* src/app/features/legal/privacy-policy-page.scss */\n:host {\n  display: block;\n}\n.legal-page {\n  max-width: 46rem;\n  margin: var(--space-32) auto 0;\n  padding: 0 var(--space-16) var(--space-32);\n}\n.legal-page section {\n  margin-bottom: var(--space-24);\n}\n.legal-page h2 {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-lg);\n}\n.legal-page p,\n.legal-page ul {\n  margin: 0 0 var(--space-8);\n}\n.legal-page ul {\n  padding-left: var(--space-16);\n  list-style: disc;\n}\n.legal-page {\n}\n.legal-page .legal-page__updated {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: 0 0 var(--space-20);\n}\n.legal-page {\n}\n.legal-page .legal-page__toc {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  background: var(--color-bg-subtle);\n  padding: var(--space-16) var(--space-20);\n  margin: 0 0 var(--space-24);\n}\n.legal-page .legal-page__toc ol {\n  margin: 0;\n  padding-left: var(--space-16);\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-6);\n}\n/*# sourceMappingURL=privacy-policy-page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(PrivacyPolicyPage, { className: "PrivacyPolicyPage", filePath: "src/app/features/legal/privacy-policy-page.ts", lineNumber: 29 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Flegal%2Fprivacy-policy-page.ts%40PrivacyPolicyPage";
  function PrivacyPolicyPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(PrivacyPolicyPage, m.default, [i0], [RouterLink, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && PrivacyPolicyPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && PrivacyPolicyPage_HmrLoad(d.timestamp)));
})();
export {
  PrivacyPolicyPage
};
//# debugId=b5036db5-a4ea-5293-83c4-5cd356db1f65


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvbGVnYWwvcHJpdmFjeS1wb2xpY3ktcGFnZS50cyIsInNyYy9hcHAvZmVhdHVyZXMvbGVnYWwvcHJpdmFjeS1wb2xpY3ktcGFnZS5odG1sIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50LFxuICBPbkRlc3Ryb3ksXG4gIGluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyB0b09ic2VydmFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlL3J4anMtaW50ZXJvcCc7XG5pbXBvcnQgeyBSb3V0ZXJMaW5rIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IHNraXAgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IEkxOG5TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL2kxOG4uc2VydmljZSc7XG5pbXBvcnQgeyBUcmFuc2xhdGVQaXBlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlJztcblxuLyoqXG4gKiBTdGF0aWMgcHJpdmFjeSBwb2xpY3kgKGxlZ2FsLXJlY292ZXJ5LCBpMThuIE00KS4gTm8gYmFja2VuZCwgbm8gc3RhdGUg4oCUXG4gKiB0aGUgcGFnZSBpcyBjYXRhbG9nIGNvcHkgKGBsZWdhbC5wcml2YWN5LipgIGtleXMsIEVOIHZlcmJhdGltIGZyb20gdGhlIG9sZFxuICogc3RhdGljIHRlbXBsYXRlKSArIHJvdXRlciBsaW5rcyB0byB0aGUgYWNjb3VudCBhbmQgdGVybXMgcGFnZXMuIFRoZSBjb3B5XG4gKiBzdGF0ZXMgdGhlIGFwcCdzIEFDVFVBTCBiZWhhdmlvciAoZW5jcnlwdGlvbiBhdCByZXN0LCBjbGllbnQtc2lkZVxuICogZ2VvbG9jYXRpb24sIHNlbGYtc2VydmljZSBleHBvcnQvZGVsZXRpb24pOyByZXRlbnRpb24gaGFzIG5vIGNhbGVuZGFyXG4gKiBzY2hlZHVsZSB5ZXQg4oCUIHRoZSBvd25lciBwcm9kdWN0IGNhbGwgaXMgbG9nZ2VkLCBub3QgYXNzZXJ0ZWQgaGVyZS5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLXByaXZhY3ktcG9saWN5LXBhZ2UnLFxuICBpbXBvcnRzOiBbUm91dGVyTGluaywgVHJhbnNsYXRlUGlwZV0sXG4gIHRlbXBsYXRlVXJsOiAnLi9wcml2YWN5LXBvbGljeS1wYWdlLmh0bWwnLFxuICBzdHlsZVVybDogJy4vcHJpdmFjeS1wb2xpY3ktcGFnZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIFByaXZhY3lQb2xpY3lQYWdlIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLyoqIGkxOG4gKE00KTogdGhlIHBhZ2UgaXMgZnVsbHkgY2F0YWxvZy1kcml2ZW4gKHwgdCBwaXBlcyksIHNvIGEgbGFuZ3VhZ2VcbiAgICogIHN3aXRjaCBtdXN0IHJlLXJlbmRlciB0aGUgd2hvbGUgcGFnZS4gdG9PYnNlcnZhYmxlIGVtaXRzIHRoZSBDVVJSRU5UXG4gICAqICB2YWx1ZSBvbiBzdWJzY3JpYmUsIHNvIHNraXAoMSkg4oCUIG9ubHkgYSByZWFsIHN3aXRjaCB0cmlnZ2VycyBpdFxuICAgKiAgKHRoZSBhY2NvdW50LXBhZ2UgaWRpb20pLiBVbnN1YnNjcmliZWQgaW4gbmdPbkRlc3Ryb3kuICovXG4gIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNkciA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhbGVTdWIgPSB0b09ic2VydmFibGUodGhpcy5pMThuLmxvY2FsZSlcbiAgICAucGlwZShza2lwKDEpKVxuICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5jZHIubWFya0ZvckNoZWNrKCkpO1xuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMubG9jYWxlU3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cbn1cbiIsIjxhcnRpY2xlIGNsYXNzPVwibGVnYWwtcGFnZVwiPlxuICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2xlZ2FsLnByaXZhY3kudGl0bGUnIHwgdCB9fTwvaDE+XG4gIDxwIGNsYXNzPVwibGVnYWwtcGFnZV9fdXBkYXRlZFwiPnt7ICdsZWdhbC5wcml2YWN5LnVwZGF0ZWQnIHwgdCB9fTwvcD5cblxuICA8bmF2IGNsYXNzPVwibGVnYWwtcGFnZV9fdG9jXCIgW2F0dHIuYXJpYS1sYWJlbF09XCInbGVnYWwudG9jLmFyaWEnIHwgdFwiPlxuICAgIDxvbD5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cIndob1wiPnt7ICdsZWdhbC5wcml2YWN5LndobycgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCIgZnJhZ21lbnQ9XCJzY29wZVwiPnt7ICdsZWdhbC5wcml2YWN5LnNjb3BlJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cImNvbGxlY3RcIj57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0JyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cIndoeVwiPnt7ICdsZWdhbC5wcml2YWN5LndoeScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiIGZyYWdtZW50PVwidmVyaWZpY2F0aW9uXCI+e3sgJ2xlZ2FsLnByaXZhY3kudmVyaWZpY2F0aW9uJyB8IHQgfX08L2E+XG4gICAgICA8L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiIGZyYWdtZW50PVwibG9jYXRpb25cIj57eyAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbicgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCIgZnJhZ21lbnQ9XCJjb250ZW50XCI+e3sgJ2xlZ2FsLnByaXZhY3kuY29udGVudCcgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCIgZnJhZ21lbnQ9XCJjb29raWVzXCI+e3sgJ2xlZ2FsLnByaXZhY3kuY29va2llcycgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiIGZyYWdtZW50PVwidGhpcmQtcGFydGllc1wiPnt7ICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcycgfCB0IH19PC9hPlxuICAgICAgPC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cInNoYXJpbmdcIj57eyAnbGVnYWwucHJpdmFjeS5zaGFyaW5nJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cInJldGVudGlvblwiPnt7ICdsZWdhbC5wcml2YWN5LnJldGVudGlvbicgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCIgZnJhZ21lbnQ9XCJyaWdodHNcIj57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMnIHwgdCB9fTwvYT48L2xpPlxuICAgICAgPGxpPjxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiIGZyYWdtZW50PVwic2VjdXJpdHlcIj57eyAnbGVnYWwucHJpdmFjeS5zZWN1cml0eScgfCB0IH19PC9hPjwvbGk+XG4gICAgICA8bGk+PGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCIgZnJhZ21lbnQ9XCJjaGlsZHJlblwiPnt7ICdsZWdhbC5wcml2YWN5LmNoaWxkcmVuJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cImNoYW5nZXNcIj57eyAnbGVnYWwucHJpdmFjeS5jaGFuZ2VzJyB8IHQgfX08L2E+PC9saT5cbiAgICAgIDxsaT48YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cImNvbnRhY3RcIj57eyAnbGVnYWwucHJpdmFjeS5jb250YWN0JyB8IHQgfX08L2E+PC9saT5cbiAgICA8L29sPlxuICA8L25hdj5cblxuICA8c2VjdGlvbiBpZD1cIndob1wiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS53aG8nIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kud2hvLnAxJyB8IHQgfX08L3A+XG4gICAgPHA+XG4gICAgICB7eyAnbGVnYWwucHJpdmFjeS53aG8ucDIuYmVmb3JlJyB8IHQgfX08c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5Lndoby5wMi5zdHJvbmcnIHwgdFxuICAgICAgfX08L3N0cm9uZz57eyAnbGVnYWwucHJpdmFjeS53aG8ucDIuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwic2NvcGVcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kuc2NvcGUnIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kuc2NvcGUucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiY29sbGVjdFwiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0JyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QucDEnIHwgdCB9fTwvcD5cbiAgICA8dWw+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkxLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpMS5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkxLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkyLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpMi5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkyLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkzLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpMy5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkzLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGk0LmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpNC5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGk0LmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgPC91bD5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QucDIuYmVmb3JlJyB8IHQgfX08c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QucDIuc3Ryb25nJyB8IHRcbiAgICAgIH19PC9zdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5wMi5taWRkbGUnIHwgdFxuICAgICAgfX08YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIiBmcmFnbWVudD1cImNvbnRlbnRcIj57eyAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAyLmxpbmsnIHwgdCB9fTwvYVxuICAgICAgPnt7ICdsZWdhbC5wcml2YWN5LmNvbGxlY3QucDIuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwid2h5XCI+XG4gICAgPGgyPnt7ICdsZWdhbC5wcml2YWN5LndoeScgfCB0IH19PC9oMj5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS53aHkucDEnIHwgdCB9fTwvcD5cbiAgICA8dWw+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kud2h5LmxpMS5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS53aHkubGkxLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kud2h5LmxpMi5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS53aHkubGkyLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kud2h5LmxpMy5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS53aHkubGkzLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kud2h5LmxpNC5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS53aHkubGk0LmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kud2h5LmxpNS5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS53aHkubGk1LmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgPC91bD5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS53aHkucDInIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwidmVyaWZpY2F0aW9uXCI+XG4gICAgPGgyPnt7ICdsZWdhbC5wcml2YWN5LnZlcmlmaWNhdGlvbicgfCB0IH19PC9oMj5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS52ZXJpZmljYXRpb24ucDEnIHwgdCB9fTwvcD5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS52ZXJpZmljYXRpb24ucDInIHwgdCB9fTwvcD5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS52ZXJpZmljYXRpb24ucDMnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwibG9jYXRpb25cIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kubG9jYXRpb24nIHwgdCB9fTwvaDI+XG4gICAgPHA+XG4gICAgICB7eyAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMS5iZWZvcmUnIHwgdCB9fTxlbT57eyAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMS5lbScgfCB0XG4gICAgICB9fTwvZW0+e3sgJ2xlZ2FsLnByaXZhY3kubG9jYXRpb24ucDEuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAyLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMi5zdHJvbmcnIHwgdFxuICAgICAgfX08L3N0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMi5hZnRlcicgfCB0IH19XG4gICAgPC9wPlxuICAgIDxwPlxuICAgICAge3sgJ2xlZ2FsLnByaXZhY3kubG9jYXRpb24ucDMuYmVmb3JlJyB8IHQgfX08c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAzLnN0cm9uZycgfCB0XG4gICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAzLmFmdGVyJyB8IHQgfX1cbiAgICA8L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cImNvbnRlbnRcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kuY29udGVudCcgfCB0IH19PC9oMj5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvbnRlbnQucDEuYmVmb3JlJyB8IHRcbiAgICAgIH19PGEgcm91dGVyTGluaz1cIi9hY2NvdW50XCI+e3sgJ2xlZ2FsLnByaXZhY3kubGluay5hY2NvdW50UGFnZScgfCB0IH19PC9hXG4gICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kuY29udGVudC5wMS5hZnRlcicgfCB0IH19XG4gICAgPC9wPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LmNvbnRlbnQucDInIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiY29va2llc1wiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5jb29raWVzJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMucDEnIHwgdCB9fTwvcD5cbiAgICA8dWw+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkxLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMS5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkxLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkyLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMi5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkyLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkzLmJlZm9yZScgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMy5zdHJvbmcnIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkzLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgPC91bD5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS5jb29raWVzLnAyJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInRoaXJkLXBhcnRpZXNcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5wMScgfCB0IH19PC9wPlxuICAgIDx1bD5cbiAgICAgIDxsaT5cbiAgICAgICAge3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMS5iZWZvcmUnIHwgdFxuICAgICAgICB9fTxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMS5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS50aGlyZFBhcnRpZXMubGkxLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIHt7ICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5saTIuYmVmb3JlJyB8IHRcbiAgICAgICAgfX08c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5saTIuc3Ryb25nJyB8IHQgfX08L3N0cm9uZ1xuICAgICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMi5hZnRlcicgfCB0IH19XG4gICAgICA8L2xpPlxuICAgICAgPGxpPlxuICAgICAgICA8c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5saTMuc3Ryb25nJyB8IHQgfX08L3N0cm9uZ1xuICAgICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMy5hZnRlcicgfCB0IH19XG4gICAgICA8L2xpPlxuICAgIDwvdWw+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLnAyJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInNoYXJpbmdcIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kuc2hhcmluZycgfCB0IH19PC9oMj5cbiAgICA8cD57eyAnbGVnYWwucHJpdmFjeS5zaGFyaW5nLnAxJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInJldGVudGlvblwiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24nIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnAxJyB8IHQgfX08L3A+XG4gICAgPHA+XG4gICAgICB7eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDIuYmVmb3JlJyB8IHQgfX08c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LnJldGVudGlvbi5wMi5zdHJvbmcnIHwgdFxuICAgICAgfX08L3N0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDIubWlkZGxlJyB8IHRcbiAgICAgIH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDIuc3Ryb25nMicgfCB0IH19PC9zdHJvbmdcbiAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDIuYWZ0ZXInIHwgdCB9fVxuICAgIDwvcD5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC5wcml2YWN5LnJldGVudGlvbi5wMy5iZWZvcmUnIHwgdFxuICAgICAgfX08Y29kZT57eyAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDMuY29kZScgfCB0IH19PC9jb2RlXG4gICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnAzLmFmdGVyJyB8IHQgfX1cbiAgICA8L3A+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnA0JyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cblxuICA8c2VjdGlvbiBpZD1cInJpZ2h0c1wiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMnIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLnAxJyB8IHQgfX08L3A+XG4gICAgPHVsPlxuICAgICAgPGxpPlxuICAgICAgICA8c3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTEuc3Ryb25nJyB8IHQgfX08L3N0cm9uZ1xuICAgICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMS5hbmQnIHwgdCB9fTxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMS5zdHJvbmcyJyB8IHRcbiAgICAgICAgfX08L3N0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkxLm1pZGRsZScgfCB0XG4gICAgICAgIH19PGEgcm91dGVyTGluaz1cIi9hY2NvdW50XCI+e3sgJ2xlZ2FsLnByaXZhY3kubGluay5hY2NvdW50UGFnZScgfCB0IH19PC9hXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkxLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMi5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkyLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMy5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkzLm1pZGRsZScgfCB0XG4gICAgICAgIH19PGEgcm91dGVyTGluaz1cIi9hY2NvdW50XCI+e3sgJ2xlZ2FsLnByaXZhY3kubGluay5hY2NvdW50UGFnZScgfCB0IH19PC9hXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkzLmFmdGVyJyB8IHQgfX1cbiAgICAgIDwvbGk+XG4gICAgICA8bGk+XG4gICAgICAgIDxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpNC5zdHJvbmcnIHwgdCB9fTwvc3Ryb25nXG4gICAgICAgID57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGk0LmFuZCcgfCB0IH19PHN0cm9uZz57eyAnbGVnYWwucHJpdmFjeS5yaWdodHMubGk0LnN0cm9uZzInIHwgdFxuICAgICAgICB9fTwvc3Ryb25nPnt7ICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTQuYWZ0ZXInIHwgdCB9fVxuICAgICAgPC9saT5cbiAgICA8L3VsPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5wMicgfCB0IH19PC9wPlxuICA8L3NlY3Rpb24+XG5cbiAgPHNlY3Rpb24gaWQ9XCJzZWN1cml0eVwiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5zZWN1cml0eScgfCB0IH19PC9oMj5cbiAgICA8cD5cbiAgICAgIHt7ICdsZWdhbC5wcml2YWN5LnNlY3VyaXR5LnAxLmJlZm9yZScgfCB0XG4gICAgICB9fTxzdHJvbmc+e3sgJ2xlZ2FsLnByaXZhY3kuc2VjdXJpdHkucDEuc3Ryb25nJyB8IHQgfX08L3N0cm9uZ1xuICAgICAgPnt7ICdsZWdhbC5wcml2YWN5LnNlY3VyaXR5LnAxLmFmdGVyJyB8IHQgfX1cbiAgICA8L3A+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kuc2VjdXJpdHkucDInIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiY2hpbGRyZW5cIj5cbiAgICA8aDI+e3sgJ2xlZ2FsLnByaXZhY3kuY2hpbGRyZW4nIHwgdCB9fTwvaDI+XG4gICAgPHA+e3sgJ2xlZ2FsLnByaXZhY3kuY2hpbGRyZW4ucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiY2hhbmdlc1wiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5jaGFuZ2VzJyB8IHQgfX08L2gyPlxuICAgIDxwPnt7ICdsZWdhbC5wcml2YWN5LmNoYW5nZXMucDEnIHwgdCB9fTwvcD5cbiAgPC9zZWN0aW9uPlxuXG4gIDxzZWN0aW9uIGlkPVwiY29udGFjdFwiPlxuICAgIDxoMj57eyAnbGVnYWwucHJpdmFjeS5jb250YWN0JyB8IHQgfX08L2gyPlxuICAgIDxwPlxuICAgICAge3sgJ2xlZ2FsLnByaXZhY3kuY29udGFjdC5wMS5iZWZvcmUnIHwgdFxuICAgICAgfX08YSByb3V0ZXJMaW5rPVwiL3Rlcm1zXCI+e3sgJ2xlZ2FsLnByaXZhY3kubGluay50ZXJtcycgfCB0IH19PC9hXG4gICAgICA+e3sgJ2xlZ2FsLnByaXZhY3kuY29udGFjdC5wMS5hZnRlcicgfCB0IH19XG4gICAgPC9wPlxuICA8L3NlY3Rpb24+XG48L2FydGljbGU+XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxTQUNFLHlCQUNBLG1CQUNBLFdBRUEsY0FDSztBQUNQLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsWUFBWTs7QUFtQmYsSUFBTyxvQkFBUCxNQUFPLG1CQUFzQzs7Ozs7RUFLeEMsT0FBTyxPQUFPLFdBQVc7RUFDakIsTUFBTSxPQUFPLGlCQUFpQjtFQUU5QixZQUFZLGFBQWEsS0FBSyxLQUFLLE1BQU0sRUFDdkQsS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUNaLFVBQVUsTUFBTSxLQUFLLElBQUksYUFBWSxDQUFFO0VBRTFDLGNBQW1CO0FBQ2pCLFNBQUssVUFBVSxZQUFXO0VBQzVCOztxQ0FkVyxvQkFBaUI7RUFBQTs0RUFBakIsb0JBQWlCLFdBQUEsQ0FBQSxDQUFBLHlCQUFBLENBQUEsR0FBQSxPQUFBLEtBQUEsTUFBQSxLQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsWUFBQSxHQUFBLENBQUEsR0FBQSxZQUFBLEdBQUEsQ0FBQSxHQUFBLHFCQUFBLEdBQUEsQ0FBQSxHQUFBLGlCQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxLQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxPQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxLQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxjQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxVQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxlQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxXQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxRQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxVQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxVQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxjQUFBLFlBQUEsWUFBQSxTQUFBLEdBQUEsQ0FBQSxNQUFBLEtBQUEsR0FBQSxDQUFBLE1BQUEsT0FBQSxHQUFBLENBQUEsTUFBQSxTQUFBLEdBQUEsQ0FBQSxNQUFBLEtBQUEsR0FBQSxDQUFBLE1BQUEsY0FBQSxHQUFBLENBQUEsTUFBQSxVQUFBLEdBQUEsQ0FBQSxNQUFBLFNBQUEsR0FBQSxDQUFBLGNBQUEsVUFBQSxHQUFBLENBQUEsTUFBQSxTQUFBLEdBQUEsQ0FBQSxNQUFBLGVBQUEsR0FBQSxDQUFBLE1BQUEsU0FBQSxHQUFBLENB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Q0FBQTtBQUVPLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLDRCQUFBLENBQUE7QUFFRixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSx3QkFBQSxDQUFBO0FBQ0QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsdUJBQUEsQ0FBQTtBQUNBLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLHVCQUFBLENBQUE7QUFFSSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSw0QkFBQSxDQUFBO0FBRUosTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsdUJBQUEsQ0FBQTtBQUNFLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLHlCQUFBLENBQUE7QUFDSCxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSxzQkFBQSxDQUFBO0FBQ0UsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsd0JBQUEsQ0FBQTtBQUNBLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsSUFBQSxLQUFBLHdCQUFBLENBQUE7QUFDRCxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSx1QkFBQSxDQUFBO0FBQ0EsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsdUJBQUEsQ0FBQTtBQUs5QyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLElBQUEsS0FBQSxtQkFBQSxDQUFBO0FBQ0QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxJQUFBLEtBQUEsc0JBQUEsQ0FB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LCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw4QkFBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSw2QkFBQSxHQUFBLEdBQUE7QUFHTyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw4QkFBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSw2QkFBQSxHQUFBLEdBQUE7QUFHTyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw4QkFBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSw2QkFBQSxHQUFBLEdBQUE7QUFHTyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw4QkFBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSw2QkFBQSxHQUFBLEdBQUE7QUFHTyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSw4QkFBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSw2QkFBQSxHQUFBLEdBQUE7QUFHRixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSxzQkFBQSxDQUFBO0FBSUMsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsNEJBQUEsQ0FBQTtBQUNELE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLCtCQUFBLENBQUE7QUFDQSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEs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QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSxpQ0FBQSxHQUFBLEdBQUE7QUFHWixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSwwQkFBQSxDQUFBO0FBSUMsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsNEJBQUEsQ0FBQTtBQUNELE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLCtCQUFBLENBQUE7QUFHQyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLGdDQUFBLEtBQUEseUJBQUEsS0FBQSxLQUFBLHVDQUFBLENBQUE7QUFDVSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSx1Q0FBQSxDQUFBO0FBQ1QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSxzQ0FBQSxHQUFBLEdBQUE7QUFHRCxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLGdDQUFBLEtBQUEseUJBQUEsS0FBQSxLQUFBLHVDQUFBLENBQUE7QUFDVSxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSx1Q0FBQSxDQUFBO0FBQ1QsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSxzQ0FBQSxHQUFBLEdBQUE7QUFHTyxNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSx1Q0FBQSxDQUFBO0FBQ1AsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSxnQ0FBQSxJQUFBLHlCQUFBLEtBQUEsS0FBQSxzQ0FBQSxHQUFBLEdBQUE7QUFHRixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLCtCQUFBLHlCQUFBLEtBQUEsS0FBQSwrQkFBQSxDQUFBO0FBSUMsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFB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dUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEseUJBQUEsS0FBQSxLQUFBLHVCQUFBLENBQUE7QUFFRixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLGdDQUFBLEtBQUEseUJBQUEsS0FBQSxLQUFBLGlDQUFBLENBQUE7QUFDeUIsTUFBQSx1QkFBQSxDQUFBO0FBQUEsTUFBQSwrQkFBQSx5QkFBQSxLQUFBLEtBQUEsMEJBQUEsQ0FBQTtBQUN4QixNQUFBLHVCQUFBLENBQUE7QUFBQSxNQUFBLGdDQUFBLElBQUEseUJBQUEsS0FBQSxLQUFBLGdDQUFBLEdBQUEsR0FBQTs7b0JEck9LLFlBQVksYUFBYSxHQUFBLFFBQUEsQ0FBQSwyL0NBQUEsRUFBQSxDQUFBOzs7K0VBS3hCLG1CQUFpQixDQUFBO1VBUDdCO3VCQUNXLDJCQUF5QixTQUMxQixDQUFDLFlBQVksYUFBYSxHQUFDLGlCQUduQix3QkFBd0IsUUFBTSxVQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBQUEsUUFBQSxDQUFBLDRrQ0FBQSxFQUFBLENBQUE7Ozs7Z0ZBRXBDLG1CQUFpQixFQUFBLFdBQUEscUJBQUEsVUFBQSxpREFBQSxZQUFBLEdBQUEsQ0FBQTtBQUFBLEdBQUE7Ozs7Ozs7OERBQWpCLG1CQUFpQixFQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLGVBQUEsV0FBQSx1QkFBQSxHQUFBLGFBQUEsRUFBQSxDQUFBO0VBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGNBQUEsMEJBQUEsS0FBQSxJQUFBLENBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGVBQUEsWUFBQSxPQUFBLFlBQUEsSUFBQSxHQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsTUFBQSwwQkFBQSxFQUFBLFNBQUEsQ0FBQTtBQUFBLEdBQUE7IiwibmFtZXMiOltdLCJkZWJ1Z0lkIjoiYjUwMzZkYjUtYTRlYS01MjkzLTgzYzQtNWNkMzU2ZGIxZjY1In0=