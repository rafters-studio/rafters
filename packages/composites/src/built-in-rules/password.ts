import { z } from 'zod';

export const password = z.string().min(8);
