import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import { GraphQLJSON } from 'graphql-type-json';
import { WorkflowGraphqlModule } from './workflow-graphql/workflow-graphql.module.js';
import { WorkflowExecutionModule } from './workflow-execution/workflow-execution.module.js';
import { WorkflowDefinitionModule } from './workflow-definition/workflow-definition.module.js';
import { ExecutionStreamModule } from './event-stream/execution-stream.module.js';
import { NodeRuntimeModule } from './node-runtime/node-runtime.module.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      path: '/graphql',
      context: ({ req }: { req?: unknown }) => ({ req }),
      resolvers: { JSON: GraphQLJSON },
    }),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [
        join(process.cwd(), 'dist/database/migrations/*.js'),
        join(process.cwd(), 'src/database/migrations/*.ts'),
      ],
      autoSave: true,
      location: 'workflow-engine.sqlite',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    WorkflowExecutionModule,
    WorkflowDefinitionModule,
    ExecutionStreamModule,
    NodeRuntimeModule,
    QueueModule,
    WorkflowGraphqlModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
