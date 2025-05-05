// filepath: /home/long/vercel_chatui/lib/ai/tools/think.ts
import { tool } from 'ai';
import { z } from 'zod';

/**
 * The "think" tool allows Claude to stop and think through complex problems
 * before taking action. It's particularly helpful for:
 * 1. Tool output analysis - Processing outputs before acting 
 * 2. Policy-heavy environments - Following detailed guidelines
 * 3. Sequential decision making - Making decisions where each step builds on previous ones
 * 
 * Based on Anthropic's research: https://www.anthropic.com/engineering/claude-think-tool
 */
export const think = tool({
    description: 'Use this tool to think through complex problems step by step. ' +
        'It creates space for structured thinking when analyzing tool outputs, ' +
        'following complex policies, or making sequential decisions. ' +
        'Your thoughts are visible to the user and help explain your reasoning process.',
    parameters: z.object({
        thought: z.string().describe('Your detailed, step-by-step thought process. Break down complex reasoning into clear steps. Include analyzing options, evaluating evidence, or making structured decisions.'),
    }),
    execute: async ({ thought }) => {
        console.log('Think tool used: ', thought);
        // Simply return the thought - no processing needed
        return {
            thought: thought,
            timestamp: new Date().toISOString(),
        };
    },
});