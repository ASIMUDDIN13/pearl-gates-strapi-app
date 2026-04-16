import type { Core } from '@strapi/strapi';

const UID = 'api::landing-page.landing-page' as const;

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `page-${Date.now()}`;
}

export default () => ({
  register({ strapi }: { strapi: Core.Strapi }) {
    const s = strapi as any;

    // ── Admin JWT authentication middleware ──────────────────────────────────
    const authenticate = async (ctx: any, next: () => Promise<void>) => {
      const authHeader: string = ctx.request.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
      }
      try {
        const token = authHeader.slice(7);
        const secret = s.config.get('admin.auth.secret') as string;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('jsonwebtoken').verify(token, secret);
        await next();
      } catch {
        ctx.status = 401;
        ctx.body = { error: 'Invalid token' };
      }
    };

    const docs = () => s.documents(UID);

    // GET /page-builder/pages  — list all landing pages
    s.server.router.get('/page-builder/pages', authenticate, async (ctx: any) => {
      try {
        const results = await docs().findMany({ sort: { createdAt: 'desc' } });
        ctx.body = { results: results ?? [] };
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: e.message };
      }
    });

    // GET /page-builder/pages/:documentId  — get one page
    s.server.router.get('/page-builder/pages/:documentId', authenticate, async (ctx: any) => {
      try {
        const doc = await docs().findOne({ documentId: ctx.params.documentId });
        if (!doc) { ctx.status = 404; ctx.body = { error: 'Not Found' }; return; }
        ctx.body = doc;
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: e.message };
      }
    });

    // POST /page-builder/pages  — create a new page
    s.server.router.post('/page-builder/pages', authenticate, async (ctx: any) => {
      try {
        const data: any = { ...(ctx.request.body as any) };
        if (!data.slug) data.slug = slugify(data.title || '');
        const doc = await docs().create({ data });
        ctx.status = 201;
        ctx.body = doc;
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    });

    // PUT /page-builder/pages/:documentId  — update a page
    s.server.router.put('/page-builder/pages/:documentId', authenticate, async (ctx: any) => {
      try {
        const data: any = { ...(ctx.request.body as any) };
        const doc = await docs().update({ documentId: ctx.params.documentId, data });
        ctx.body = doc;
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    });

    // DELETE /page-builder/pages/:documentId  — delete a page
    s.server.router.delete('/page-builder/pages/:documentId', authenticate, async (ctx: any) => {
      try {
        await docs().delete({ documentId: ctx.params.documentId });
        ctx.status = 204;
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: e.message };
      }
    });
  },

  bootstrap() {},
});
