import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class AuthAuditEventModel {
  @Field(() => Int)
  id!: number;

  @Field()
  ownerId!: string;

  @Field()
  action!: string;

  @Field()
  reason!: string;

  @Field({ nullable: true })
  authType?: string;

  @Field({ nullable: true })
  method?: string;

  @Field({ nullable: true })
  endpoint?: string;

  @Field()
  timestamp!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}
