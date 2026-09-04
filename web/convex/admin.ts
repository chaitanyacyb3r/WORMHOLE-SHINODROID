import { mutation } from './_generated/server.js';
export const nukeStuck = mutation(async ({ db }) => {
    const scans = await db.query('scans').filter(q => q.eq(q.field('status'), 'scanning')).collect();
    for (const s of scans) {
        await db.patch(s._id, { status: 'failed' });
    }
});
