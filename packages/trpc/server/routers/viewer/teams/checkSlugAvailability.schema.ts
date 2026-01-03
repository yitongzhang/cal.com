import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCheckSlugAvailabilityInputSchema = z.object({
  slug: z.string().transform((val) => slugify(val.trim())),
});

export type TCheckSlugAvailabilityInputSchema = z.infer<typeof ZCheckSlugAvailabilityInputSchema>;
