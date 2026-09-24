import { registerLocaleData } from '@angular/common';
import etLocale from '@angular/common/locales/et';
import ruLocale from '@angular/common/locales/ru';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register the non-English locale data so the `date` pipe
// formats dates natively when the app locale is `et` or `ru` (the shell
// footer's last-import stamp and the /account contribution dates follow
// the active locale).
registerLocaleData(etLocale);
registerLocaleData(ruLocale);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
