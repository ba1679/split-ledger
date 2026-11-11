export interface IsolatedStep<Input, Context> {
  readonly phrase: string;
  readonly input: Input;
  readonly execute: (context: Context, input: Input) => Promise<void>;
}

/** Executes one registered sentence without depending on unrelated missing steps. */
export async function runIsolatedStep<Input, Context>(
  step: IsolatedStep<Input, Context>,
  context: Context,
): Promise<void> {
  await step.execute(context, step.input);
}
