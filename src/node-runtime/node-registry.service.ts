import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { NodeExecutor } from './node-executor.interface.js';
import { NODE_TYPE_METADATA } from './node.decorator.js';

@Injectable()
export class NodeRegistryService implements OnModuleInit {
  private readonly registry = new Map<string, NodeExecutor>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance) {
        continue;
      }

      const nodeType = this.reflector.get<string>(
        NODE_TYPE_METADATA,
        instance.constructor,
      );
      if (!nodeType) {
        continue;
      }

      this.registry.set(nodeType, instance as NodeExecutor);
    }
  }

  getExecutor(type: string): NodeExecutor {
    const executor = this.registry.get(type);
    if (!executor) {
      throw new Error(`No executor registered for node type: ${type}`);
    }
    return executor;
  }
}
