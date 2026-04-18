import type { Core } from '@strapi/strapi';

const LANDING_PAGE_UID = 'api::landing-page.landing-page' as const;

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `page-${Date.now()}`;
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const s = strapi as any;

    // ── Register /page-builder/pages routes via Koa middleware ─────────────
    // Plugin route handlers don't resolve cross-plugin in Strapi v5, so we
    // mount these directly on the Koa app before any 404 handler fires.
    const app = s.server.app;

    app.use(async (ctx: any, next: () => Promise<void>) => {
      const { method, path } = ctx;

      // GET /page-builder/pages
      if (method === 'GET' && path === '/page-builder/pages') {
        try {
          const results = await s.documents(LANDING_PAGE_UID).findMany({ sort: { createdAt: 'desc' } });
          ctx.body = {
            data: results ?? [],
            meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: results?.length ?? 0 } },
          };
        } catch (e: any) {
          ctx.status = 500;
          ctx.body = { error: e.message };
        }
        return;
      }

      // POST /page-builder/pages
      if (method === 'POST' && path === '/page-builder/pages') {
        try {
          const body: any = ctx.request.body ?? {};
          const data: any = { ...(body.data ?? body) };
          if (!data.slug) data.slug = slugify(data.title || '');
          const doc = await s.documents(LANDING_PAGE_UID).create({ data });
          ctx.status = 201;
          ctx.body = { data: doc };
        } catch (e: any) {
          ctx.status = 400;
          ctx.body = { error: e.message };
        }
        return;
      }

      // GET /page-builder/pages/:id
      const getOneMatch = path.match(/^\/page-builder\/pages\/([^/]+)$/);
      if (method === 'GET' && getOneMatch) {
        const documentId = getOneMatch[1];
        try {
          const doc = await s.documents(LANDING_PAGE_UID).findOne({ documentId });
          if (!doc) { ctx.status = 404; ctx.body = { error: 'Not Found' }; return; }
          ctx.body = { data: doc };
        } catch (e: any) {
          ctx.status = 500;
          ctx.body = { error: e.message };
        }
        return;
      }

      // PUT /page-builder/pages/:id
      const putMatch = path.match(/^\/page-builder\/pages\/([^/]+)$/);
      if (method === 'PUT' && putMatch) {
        const documentId = putMatch[1];
        try {
          const body: any = ctx.request.body ?? {};
          const data: any = { ...(body.data ?? body) };
          const doc = await s.documents(LANDING_PAGE_UID).update({ documentId, data });
          ctx.body = { data: doc };
        } catch (e: any) {
          ctx.status = 500;
          ctx.body = { error: e.message };
        }
        return;
      }

      // DELETE /page-builder/pages/:id
      const delMatch = path.match(/^\/page-builder\/pages\/([^/]+)$/);
      if (method === 'DELETE' && delMatch) {
        const documentId = delMatch[1];
        try {
          await s.documents(LANDING_PAGE_UID).delete({ documentId });
          ctx.status = 204;
        } catch (e: any) {
          ctx.status = 500;
          ctx.body = { error: e.message };
        }
        return;
      }

      await next();
    });

    // ── Remove Content Manager sidebar permissions for landing-page ─────────
    try {
      await s.db.query('admin::permission').deleteMany({
        where: {
          subject: LANDING_PAGE_UID,
          action: { $startsWith: 'plugin::content-manager' },
        },
      });
    } catch {
      // Non-fatal on first boot.
    }
  },
};
