import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class TriggerWorkflowInput {
  @Field()
  workflowId!: string;

  @Field(() => GraphQLJSON)
  input!: Record<string, unknown>;

  @Field({ nullable: true })
  correlationId?: string;
}
