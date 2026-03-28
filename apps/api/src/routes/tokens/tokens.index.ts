import { createRouter } from '@/lib/create-app';

import * as handlers from './tokens.handlers';
import * as routes from './tokens.routes';

const router = createRouter()
  // Getters -- return ALL the data
  .openapi(routes.getSystem, handlers.getSystem)
  .openapi(routes.getAllTokens, handlers.getAllTokens)
  .openapi(routes.getNamespace, handlers.getNamespace)
  .openapi(routes.getToken, handlers.getToken)
  // Setters -- value + reason in, { ok: true } out
  .openapi(routes.setToken, handlers.setToken)
  .openapi(routes.clearOverride, handlers.clearOverride)
  // Color -- OKLCH in, ColorValue out
  .openapi(routes.buildColor, handlers.buildColor)
  // Reset
  .openapi(routes.resetNamespace, handlers.resetNamespace);

export default router;
