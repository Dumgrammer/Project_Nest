import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEventEntity } from './execution-event.entity.js';
import { ExecutionRecordEntity } from './execution-record.entity.js';
import { ExecutionStoreService } from './execution-store.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ExecutionRecordEntity, ExecutionEventEntity])],
  providers: [ExecutionStoreService],
  exports: [ExecutionStoreService],
})
export class ExecutionStoreModule {}
