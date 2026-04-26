export interface LlmProvider {
  complete(prompt: string): Promise<string>;
}
