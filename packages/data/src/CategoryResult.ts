import {
  entity,
  int,
  role,
  text,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class CategoryResult {
  @uuid() id!: string;

  @uuid() assessmentId!: string;

  @text({ max: 100 }) category!: string;

  @int() score!: number;

  @int() maximumScore!: number;

  @text({ max: 50 }) status!: string;

  @text({ max: 200 }) owner_id!: string;
}
