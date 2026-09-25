import configureOpenAPI from '@/lib/configure-open-api';
import createApp from '@/lib/create-app';
import { processColorSeedBatch } from '@/lib/queue/consumer';
import type { ColorSeedMessage } from '@/lib/queue/publisher';
import color from '@/routes/color/color.index';
import index from '@/routes/index.route';
import queue from '@/routes/queue/queue.index';

const app = createApp();

configureOpenAPI(app);

const routes = [index, color, queue] as const;

for (const route of routes) {
  app.route('/', route);
}

export type AppType = (typeof routes)[number];

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<ColorSeedMessage>, env: Env): Promise<void> {
    await processColorSeedBatch(batch, env, app);
  },
};
