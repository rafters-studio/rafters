import { z } from 'zod';
import { email } from './email';

export const credentials = z.object({ email, password: z.string().min(8) });
