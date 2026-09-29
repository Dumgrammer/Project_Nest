import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class NodeErrorConfigModel {
  @Field()
  policy!: string;

  @Field({ nullable: true })
  fallbackNode?: string;
}

@ObjectType()
export class WorkflowNodeModel {
  @Field()
  id!: string;

  @Field()
  type!: string;

  @Field(() => GraphQLJSON)
  config!: Record<string, unknown>;

  @Field(() => NodeErrorConfigModel, { nullable: true })
  onError?: NodeErrorConfigModel;
}

@ObjectType()
export class WorkflowDefinitionModel {
  @Field()
  id!: string;

  @Field()
  ownerId!: string;

  @Field()
  name!: string;

  @Field(() => Int)
  version!: number;

  @Field(() => [WorkflowNodeModel])
  nodes!: WorkflowNodeModel[];
}
