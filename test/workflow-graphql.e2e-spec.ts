import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import request from 'supertest';
import { ExecutionStoreService } from '../src/execution-store/execution-store.service.js';
import { WorkflowDefinitionService } from '../src/workflow-definition/workflow-definition.service.js';
import { WorkflowExecutionService } from '../src/workflow-execution/workflow-execution.service.js';
import { WorkflowGraphqlResolver } from '../src/workflow-graphql/workflow-graphql.resolver.js';

describe('WorkflowGraphqlResolver (e2e)', () => {
  let app: INestApplication;

  const workflowExecutionService = {
    trigger: vi.fn().mockResolvedValue({
      executionId: 'exec-graphql-1',
      status: 'queued',
    }),
  };

  const executionStoreService = {
    getRecord: vi.fn().mockReturnValue({
      executionId: 'exec-graphql-1',
      workflowId: 'wf-hello',
      status: 'queued',
      events: [],
    }),
    getEvents: vi.fn().mockReturnValue([]),
  };

  const workflowDefinitionService = {
    list: vi.fn().mockReturnValue([
      {
        id: 'wf-hello',
        name: 'Hello Workflow',
        version: 1,
        nodes: [{ id: 'node-webhook-1', type: 'http.webhook', config: {} }],
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: 'wf-new',
      name: 'Workflow New',
      version: 1,
      nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
    }),
    update: vi.fn().mockResolvedValue({
      id: 'wf-new',
      name: 'Workflow Updated',
      version: 2,
      nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
    }),
    remove: vi.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: true,
          path: '/graphql',
          resolvers: { JSON: GraphQLJSON },
          context: ({ req }: { req?: unknown }) => ({ req }),
        }),
      ],
      providers: [
        WorkflowGraphqlResolver,
        {
          provide: WorkflowExecutionService,
          useValue: workflowExecutionService,
        },
        {
          provide: ExecutionStoreService,
          useValue: executionStoreService,
        },
        {
          provide: WorkflowDefinitionService,
          useValue: workflowDefinitionService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('queries workflow definitions', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query { workflowDefinitions { id name version nodes { id type } } }',
      })
      .expect(200);

    expect(response.body.data.workflowDefinitions).toHaveLength(1);
    expect(response.body.data.workflowDefinitions[0].id).toBe('wf-hello');
  });

  it('triggers workflow via mutation with API key', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'dev-key')
      .send({
        query:
          'mutation($input: TriggerWorkflowInput!) { triggerWorkflow(input: $input) { executionId status } }',
        variables: {
          input: {
            workflowId: 'wf-hello',
            input: { message: 'from test' },
          },
        },
      })
      .expect(200);

    expect(response.body.data.triggerWorkflow).toEqual({
      executionId: 'exec-graphql-1',
      status: 'queued',
    });
    expect(workflowExecutionService.trigger).toHaveBeenCalledWith(
      'public',
      'wf-hello',
      { message: 'from test' },
      undefined,
    );
  });

  it('rejects mutation with invalid API key', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'wrong-key')
      .send({
        query:
          'mutation($input: TriggerWorkflowInput!) { triggerWorkflow(input: $input) { executionId status } }',
        variables: {
          input: {
            workflowId: 'wf-hello',
            input: { message: 'from test' },
          },
        },
      })
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].message).toContain('Invalid API key');
  });

  it('rejects mutation when required workflowId is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'dev-key')
      .send({
        query:
          'mutation($input: TriggerWorkflowInput!) { triggerWorkflow(input: $input) { executionId status } }',
        variables: {
          input: {
            input: { message: 'from test' },
          },
        },
      })
      .expect(400);

    expect(response.body.errors[0].message).toContain('workflowId');
    expect(workflowExecutionService.trigger).not.toHaveBeenCalled();
  });

  it('creates workflow definition via mutation', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'dev-key')
      .send({
        query:
          'mutation($input: CreateWorkflowDefinitionInput!) { createWorkflowDefinition(input: $input) { id name version } }',
        variables: {
          input: {
            id: 'wf-new',
            name: 'Workflow New',
            version: 1,
            nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
          },
        },
      })
      .expect(200);

    expect(response.body.data.createWorkflowDefinition).toEqual({
      id: 'wf-new',
      name: 'Workflow New',
      version: 1,
    });
    expect(workflowDefinitionService.create).toHaveBeenCalledWith(
      {
        id: 'wf-new',
        name: 'Workflow New',
        version: 1,
        nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
      },
      'public',
    );
  });

  it('updates workflow definition via mutation', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'dev-key')
      .send({
        query:
          'mutation($id: String!, $input: UpdateWorkflowDefinitionInput!) { updateWorkflowDefinition(id: $id, input: $input) { id name version } }',
        variables: {
          id: 'wf-new',
          input: {
            name: 'Workflow Updated',
            version: 2,
          },
        },
      })
      .expect(200);

    expect(response.body.data.updateWorkflowDefinition).toEqual({
      id: 'wf-new',
      name: 'Workflow Updated',
      version: 2,
    });
    expect(workflowDefinitionService.update).toHaveBeenCalledWith('wf-new', {
      name: 'Workflow Updated',
      version: 2,
      nodes: undefined,
    }, 'public');
  });

  it('deletes workflow definition via mutation', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'dev-key')
      .send({
        query:
          'mutation($id: String!) { deleteWorkflowDefinition(id: $id) }',
        variables: {
          id: 'wf-new',
        },
      })
      .expect(200);

    expect(response.body.data.deleteWorkflowDefinition).toBe(true);
    expect(workflowDefinitionService.remove).toHaveBeenCalledWith('wf-new', 'public');
  });
});
