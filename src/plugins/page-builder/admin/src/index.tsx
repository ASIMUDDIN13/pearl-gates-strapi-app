import { PLUGIN_ID } from './pluginId';

export default {
  register(app: any) {
    // Menu link intentionally omitted — "Page Builder" in app.tsx bootstrap is the active entry
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
      isReady: true,
    });
  },
  bootstrap() {},
};
