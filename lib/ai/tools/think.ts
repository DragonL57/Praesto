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
        'You MUST follow the Language-of-Thought (LoT) format in your thinking process: ' +
        '1. Start by restating the problem under the heading "**Problem:**". ' +
        '2. Create a main section for your LoT process under the heading "**Process:**". ' +
        '3. Include these subsections in order: ' +
        '   **Observe**: - List all explicit pieces of information given in the problem statement. ' +
        '   **Expand**: - Analyze the information, consider implications, bring in relevant knowledge. ' +
        '   **Echo**: - Identify and restate only the information directly relevant to the question. ' +
        '4. Add a "Reasoning:" section showing step-by-step logical deduction. ' +
        '5. End EVERY think with a "Next Action Statement" (e.g., "I will search...", "I will respond to the user now."). ' +
        'The final output of this tool is NOT the direct response to the user. ' +
        'After your final "think" step (which must end with "I will respond to the user now"), you MUST generate a separate, user-facing natural language response (Phase 2). ' +
        'While your thoughts are visible to the user during this process, they are part of your internal monologue, not the final answer.',
    parameters: z.object({
        thought: z.string().describe('Your detailed Language-of-Thoughts (LoT) process. MUST follow the exact structure: Problem → Process → Observe → Expand → Echo → Reasoning → Next Action Statement. Each section is required, with no exceptions.'),
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