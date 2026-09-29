import { Field, InputType, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
@InputType()
export class NodeErrorConfigInput {
  @Field(() => String)
  policy!: string;

  @Field({ nullable: true })
  fallbackNode?: string;
}

@InputType()
export class WorkflowNodeInput {
  @Field()
  id!: string;

  @Field()
  type!: string;

  @Field(() => GraphQLJSON)
  config!: Record<string, unknown>;

  @Field(() => NodeErrorConfigInput, { nullable: true })
  onError?: NodeErrorConfigInput;
}

@InputType()
export class CreateWorkflowDefinitionInput {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => Int)
  version!: number;

  @Field(() => [WorkflowNodeInput])
  nodes!: WorkflowNodeInput[];
}

@InputType()
export class UpdateWorkflowDefinitionInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => Int, { nullable: true })
  version?: number;

  @Field(() => [WorkflowNodeInput], { nullable: true })
  nodes?: WorkflowNodeInput[];
}
