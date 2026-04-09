import { PLUGIN_ID } from './pluginId';

const PluginIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
  </svg>
);

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Page Builder',
      },
      Component: async () => {
        const { App } = await import('./pages/App');
        return { default: App };
      },
      permissions: [],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
      isReady: true,
    });
  },
  bootstrap() {},
};
