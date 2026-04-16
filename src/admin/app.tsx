import React from 'react';
import type { StrapiApp } from '@strapi/strapi/admin';

const PageBuilderIcon = () =>
  React.createElement('span', { style: { fontSize: 16, lineHeight: 1 } }, '🏗');

export default {
  config: {
    head: { favicon: '/company-logo.png' },
    auth: { logo: '/company-logo.png' },
    menu: { logo: '/company-logo.png' },
    locales: [],
    translations: {
      en: {
        'Auth.form.welcome.title': 'Welcome to Osyro!',
        'Auth.form.welcome.subtitle': 'Log in to your Osyro account',
        'app.components.LeftMenu.navbrand.title': 'Osyro Dashboard',
        'app.components.LeftMenu.navbrand.workplace': 'Osyro',
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: '/page-builder',
      icon: PageBuilderIcon,
      intlLabel: { id: 'page-builder.title', defaultMessage: 'Page Builder' },
      Component: async () => {
        const { default: PageBuilderApp } = await import('./extensions/PageBuilderApp');
        return { default: PageBuilderApp };
      },
    });
  },
};
