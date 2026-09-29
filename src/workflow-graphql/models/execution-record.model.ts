import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { ExecutionEventModel } from './execution-event.model.js';

@ObjectType()
export class ExecutionRecordModel {
  @Field()
  executionId!: string;

  @Field()
  ownerId!: string;

  @Field()
  workflowId!: string;

  @Field()
  status!: string;

  @Field({ nullable: true })
  correlationId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  input?: Record<string, unknown>;

  @Field({ nullable: true })
  startedAt?: string;

  @Field({ nullable: true })
  finishedAt?: string;

  @Field({ nullable: true })
  error?: string;

  @Field(() => [ExecutionEventModel])
  events!: ExecutionEventModel[];
}

@ObjectType()
export class TriggerWorkflowResultModel {
  @Field()
  executionId!: string;

  @Field()
  status!: string;
}
