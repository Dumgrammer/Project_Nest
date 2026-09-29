import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity.js';
import { WorkflowDefinition } from './workflow-definition.types.js';

@Injectable()
export class WorkflowDefinitionService implements OnModuleInit {
  constructor(
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly workflowRepo: Repository<WorkflowDefinitionEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.workflowRepo.count();
    if (existing > 0) {
      return;
    }

    await this.workflowRepo.save({
      id: 'wf-hello',
      ownerId: 'public',
      name: 'Hello Workflow',
      version: 1,
      nodes: [
        {
          id: 'node-webhook-1',
          type: 'http.webhook',
          config: {
            url: 'https://httpbin.org/post',
            method: 'POST',
          },
        },
      ],
    });
  }

  async list(ownerId = 'public'): Promise<WorkflowDefinition[]> {
    return this.workflowRepo.find({
      where: { ownerId },
      order: { id: 'ASC' },
    });
  }

  async findById(id: string, ownerId = 'public'): Promise<WorkflowDefinition> {
    const definition = await this.workflowRepo.findOne({ where: { id, ownerId } });
    if (!definition) {
      throw new NotFoundException(`Workflow definition with id ${id} not found`);
    }
    return definition;
  }

  async create(
    definition: Omit<WorkflowDefinition, 'ownerId'>,
    ownerId = 'public',
  ): Promise<WorkflowDefinition> {
    const existing = await this.workflowRepo.findOne({
      where: { id: definition.id, ownerId },
    });
    if (existing) {
      throw new ConflictException(
        `Workflow definition with id ${definition.id} already exists`,
      );
    }

    const created = this.workflowRepo.create({
      id: definition.id,
      ownerId,
      name: definition.name,
      version: definition.version,
      nodes: definition.nodes,
    });
    return await this.workflowRepo.save(created);
  }

  async update(
    id: string,
    updates: Partial<Omit<WorkflowDefinition, 'id'>>,
    ownerId = 'public',
  ): Promise<WorkflowDefinition> {
    const existing = await this.findById(id, ownerId);
    const merged = this.workflowRepo.merge(existing, updates);
    return await this.workflowRepo.save(merged);
  }

  async remove(id: string, ownerId = 'public'): Promise<boolean> {
    await this.findById(id, ownerId);
    await this.workflowRepo.delete({ id, ownerId });
    return true;
  }
}
