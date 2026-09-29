import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAuditEventEntity } from './auth-audit-event.entity.js';
import { SecurityAuditController } from './security-audit.controller.js';
import { SecurityAuditService } from './security-audit.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuthAuditEventEntity])],
  controllers: [SecurityAuditController],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
