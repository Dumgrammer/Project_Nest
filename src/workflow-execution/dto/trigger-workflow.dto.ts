import { IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerWorkflowDto {
  @IsObject()
  input!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
