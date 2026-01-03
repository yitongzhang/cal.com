import { RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TCheckSlugAvailabilityInputSchema } from "./checkSlugAvailability.schema";

type CheckSlugAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckSlugAvailabilityInputSchema;
};

export const checkSlugAvailabilityHandler = async ({ ctx, input }: CheckSlugAvailabilityOptions) => {
  const { slug } = input;
  const { user } = ctx;

  // Check if slug is empty
  if (!slug || slug.trim() === "") {
    return { available: false, message: "slug_required" };
  }

  // Check if slug is reserved
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    return { available: false, message: "slug_reserved" };
  }

  const isOrgChildTeam = !!user.profile?.organizationId;

  // Check if slug already exists for teams in same parent context
  const existingTeam = await prisma.team.findFirst({
    where: {
      slug,
      parentId: isOrgChildTeam ? user.profile?.organizationId : null,
    },
    select: {
      id: true,
    },
  });

  if (existingTeam) {
    return { available: false, message: "team_url_taken" };
  }

  return { available: true };
};

export default checkSlugAvailabilityHandler;
