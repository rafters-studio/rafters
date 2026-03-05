import { z } from 'zod';

export const required = z.string().min(1);
