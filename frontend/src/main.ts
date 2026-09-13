import { registerLocaleData } from '@angular/common';
import etLocale from '@angular/common/locales/et';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// i18n-et-en M14: register the Estonian locale data so the `date` pipe
// formats dates natively when the app locale is `et` (the shell footer's
// last-import stamp follows the active locale).
registerLocaleData(etLocale);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
