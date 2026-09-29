import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { HttpWebhookExecutor } from './executors/http-webhook.executor.js';
import { NodeRegistryService } from './node-registry.service.js';

@Module({
  imports: [DiscoveryModule],
  providers: [NodeRegistryService, HttpWebhookExecutor],
  exports: [NodeRegistryService],
})
export class NodeRuntimeModule {}
