import {
  date,
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
export class Assessment {
  @uuid() id!: string;

  @text({ max: 200 }) userName!: string;

  @int() overallScore!: number;

  @text({ max: 50 }) overallStatus!: string;

  @date() completedAt!: Date;

  @int() criticalCount!: number;

  @int() warningCount!: number;

  @int() healthyCount!: number;

  @text({ max: 200 }) owner_id!: string;
}