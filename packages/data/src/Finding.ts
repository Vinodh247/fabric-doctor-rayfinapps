import {
  entity,
  role,
  text,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class Finding {
  @uuid() id!: string;

  @uuid() assessmentId!: string;

  @text({ max: 100 }) category!: string;

  @text({ max: 50 }) severity!: string;

  @text({ max: 200 }) title!: string;

  @text({ max: 2000 }) description!: string;

  @text({ max: 2000 }) recommendation!: string;

  @text({ max: 200 }) owner_id!: string;
}