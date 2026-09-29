export interface NodeExecutor {
  execute(
    config: Record<string, unknown>,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
