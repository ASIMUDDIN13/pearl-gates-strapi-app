import type { Core } from '@strapi/strapi';

const LANDING_PAGE_UID = 'api::landing-page.landing-page' as const;

const CRM_ACCESS_TOKEN = process.env.CRM_ACCESS_TOKEN || '4JjXxl2RFf6t08NnbHVDcrKYy';
const CRM_CLIENT_NO    = process.env.CRM_CLIENT_NO    || 'TTPG25111';

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `page-${Date.now()}`;
}

async function crmPost(endpoint: string, body: unknown): Promise<{ status: number; data: unknown }> {
  const url = new URL(`https://api.osyro.com${endpoint}`);
  url.searchParams.set('AccessToken', CRM_ACCESS_TOKEN);
  url.searchParams.set('ClientNo', CRM_CLIENT_NO);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });

  let data: unknown;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const s = strapi as any;

    // ── Register /page-builder/* routes via Koa middleware ──────────────────
    // Plugin route handlers don't resolve cross-plugin in Strapi v5, so we
    // mount these directly on the Koa app before any 404 handler fires.
    const app = s.server.app;

    app.use(async (ctx: any, next: () => Promise<void>) => {
      const { method, path } = ctx;

      // POST /page-builder/crm/pages — proxy to CRM pages/save (avoids browser CORS)
      if (method === 'POST' && path === '/page-builder/crm/pages') {
        try {
          const { status, data } = await crmPost('/api/pages/save', ctx.request.body ?? {});
          ctx.status = status;
          ctx.body = data;
        } catch (e: any) {
          ctx.status = 502;
          ctx.body = { error: 'CRM proxy error', message: e.message };
        }
        return;
      }

      // POST /page-builder/crm/leads — proxy to CRM pagesleads (avoids browser CORS)
      if (method === 'POST' && path === '/page-builder/crm/leads') {
        try {
          const { status, data } = await crmPost('/api/pagesleads', ctx.request.body ?? {});
          ctx.status = status;
          ctx.body = data;
        } catch (e: any) {
          ctx.status = 502;
          ctx.body = { error: 'CRM proxy error', message: e.message };
        }
        return;
      }

      // GET /landing/:slug — redirect to the frontend so shared/preview URLs work
      const landingMatch = path.match(/^\/landing\/([^/]+)$/);
      if (method === 'GET' && landingMatch) {
        const slug = landingMatch[1];
        const frontendUrl = (process.env.FRONTEND_URL || 'https://thepearlgates-website.up.railway.app').replace(/\/$/, '');
        ctx.redirect(`${frontendUrl}/landing/${slug}`);
        return;
      }

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

    // ── Grant public read access to landing-pages API ────────────────────────
    // Without this the Angular frontend gets 403 on every /api/landing-pages
    // request, page stays null, and only the fallback Contact Form renders.
    try {
      const publicRole = await s.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' },
      });
      if (publicRole) {
        const actions = [
          'api::landing-page.landing-page.find',
          'api::landing-page.landing-page.findOne',
        ];
        for (const action of actions) {
          const exists = await s.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: publicRole.id },
          });
          if (!exists) {
            await s.db.query('plugin::users-permissions.permission').create({
              data: { action, role: publicRole.id },
            });
          }
        }
      }
    } catch {
      // Non-fatal — permissions may already exist or plugin not ready yet.
    }
  },
};
