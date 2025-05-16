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
    description: 'This tool is MANDATORY for internal, step-by-step reasoning, planning, and processing tool outputs (Phase 1). ' +
        'Articulate your detailed analysis, plan, and evaluation of information here. ' +
        'The final output of this tool is NOT the direct response to the user. ' +
        'After your final "think" step (which must end with "I will respond to the user now"), you MUST generate a separate, user-facing natural language response (Phase 2). ' +
        'While your thoughts are visible to the user during this process, they are part of your internal monologue, not the final answer.',
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