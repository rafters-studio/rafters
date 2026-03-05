import { z } from 'zod';

export const url = z.string().url();
