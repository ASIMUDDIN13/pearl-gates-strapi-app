export default {
  config: {
    head: {
      favicon: '/company-logo.png',
    },
    auth: {
      logo: '/company-logo.png',
    },
    menu: {
      logo: '/company-logo.png',
    },
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
  bootstrap() {},
};
