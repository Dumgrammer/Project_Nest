import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AuthAuditEventModel } from './auth-audit-event.model.js';

@ObjectType()
export class AuthAuditEventPageModel {
  @Field(() => [AuthAuditEventModel])
  items!: AuthAuditEventModel[];

  @Field(() => Int, { nullable: true })
  nextCursor?: number;
}
