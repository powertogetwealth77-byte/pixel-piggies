import { answerPrompt } from '../../playtest/playtest';

export interface PromptDef {
  id: string;
  question: string;
  options: string[];
}

/** The playtest quick-question set — one tap, once each, playtest-mode only. */
export const PROMPTS: Record<string, PromptDef> = {
  understand_l1: { id: 'understand_l1', question: 'Did you understand what to do?', options: ['Yes', 'Mostly', 'No'] },
  clear_loss: { id: 'clear_loss', question: 'Was it clear why you lost?', options: ['Yes', 'Not really'] },
  rescue_reward: { id: 'rescue_reward', question: 'Did rescuing this pig feel rewarding?', options: ['Yes', 'A little', 'No'] },
  sanctuary_return: { id: 'sanctuary_return', question: 'Would you come back here?', options: ['Definitely', 'Maybe', 'Probably not'] },
  keep_playing: { id: 'keep_playing', question: 'Would you keep playing?', options: ['Yes', 'Unsure', 'No'] },
};

/**
 * A single, dismissible one-tap question shown after a meaningful moment in
 * Playtest Mode. Never blocks gameplay; the answer is stored locally.
 */
export function QuickPrompt({ prompt, onClose }: { prompt: PromptDef; onClose: () => void }) {
  const pick = (answer: string) => {
    answerPrompt(prompt.id, answer);
    onClose();
  };
  return (
    <div className="quick-prompt" role="dialog" aria-label={prompt.question}>
      <p className="qp-q">{prompt.question}</p>
      <div className="qp-opts">
        {prompt.options.map((o) => (
          <button key={o} className="btn btn--mint btn--sm" onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
      <button className="qp-dismiss" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}
