import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class ExecutionEventModel {
  @Field()
  type!: string;

  @Field()
  executionId!: string;

  @Field({ nullable: true })
  nodeId?: string;

  @Field()
  timestamp!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: Record<string, unknown>;
}
