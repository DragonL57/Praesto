# AI Elements Migration Plan

## ✅ Installed Components

Successfully installed AI Elements library (32 components) at `components/ai-elements/`:

### Core Chat Components
- `message.tsx` - Message container with branches, attachments, streaming support
- `conversation.tsx` - Conversation wrapper
- `prompt-input.tsx` - Chat input with file attachments
- `code-block.tsx` - Syntax-highlighted code blocks
- `loader.tsx` - Loading states

### Advanced Features
- `reasoning.tsx` - Chain of thought display
- `chain-of-thought.tsx` - Detailed reasoning steps
- `tool.tsx` - Tool call display
- `sources.tsx` - Source citations
- `inline-citation.tsx` - Inline source references
- `suggestion.tsx` - Suggested actions
- `confirmation.tsx` - User confirmations
- `plan.tsx` - Step-by-step plans
- `task.tsx` - Task items
- `queue.tsx` - Task queue display

### Specialized Components
- `artifact.tsx` - Code artifacts
- `canvas.tsx` - Visual canvas
- `image.tsx` - Image handling
- `web-preview.tsx` - Link previews
- `model-selector.tsx` - Model picker
- `controls.tsx` - UI controls
- `toolbar.tsx` - Action toolbar
- `panel.tsx` - Side panels
- `shimmer.tsx` - Loading shimmer effect

### Workflow Components
- `node.tsx` - Workflow nodes
- `edge.tsx` - Workflow connections
- `connection.tsx` - Connection handling
- `checkpoint.tsx` - Workflow checkpoints
- `open-in-chat.tsx` - Open in chat action

## Migration Strategy

### Phase 1: Core Message Components (Priority)

#### Current Files to Migrate:
1. **components/messages/message.tsx** (1401 lines) → Use AI Elements `Message`, `MessageContent`, `MessageActions`
   - ✅ AI Elements provides: Message, MessageContent, MessageActions, MessageAction
   - 🔧 Keep custom: Editing, regeneration logic
   - 🔧 Keep custom: Gradient styles, reasoning display

2. **components/messages/messages.tsx** → Use AI Elements `Conversation`
   - Wrap messages in AI Elements Conversation component

3. **components/messages/message-reasoning.tsx** → Use AI Elements `Reasoning`, `ChainOfThought`
   - Replace custom reasoning UI with AI Elements components

4. **components/code-block.tsx** → Replace with AI Elements `CodeBlock`
   - Already has syntax highlighting, copy button, language detection

### Phase 2: Input Components

5. **components/multimodal-input/** → Use AI Elements `PromptInput`
   - Built-in file attachment support
   - Voice input support
   - Multi-line editing

6. **components/suggested-actions.tsx** → Use AI Elements `Suggestion`
   - Pre-built suggestion chips

### Phase 3: Advanced Features

7. **Tool Display** → Use AI Elements `Tool` component
   - Displays tool calls/results with proper formatting
   
8. **Source Citations** → Use AI Elements `Sources`, `InlineCitation`
   - Better source attribution display

9. **Artifacts** → Use AI Elements `Artifact`
   - Code generation artifacts

### Phase 4: Conversation Management

10. **components/chat.tsx** → Update to use AI Elements `Conversation`
11. **components/shared/shared-chat.tsx** → Update to use AI Elements components

## Key Benefits

### From AI Elements Message Component:
- ✅ Message branching (already built-in)
- ✅ File attachments display
- ✅ Streaming text support (Streamdown)
- ✅ Actions (copy, edit, regenerate)
- ✅ Tooltips and accessibility
- ✅ Responsive design
- ✅ Dark mode support

### What to Keep from Current Implementation:
- 🔧 Chat history integration
- 🔧 Gradient backgrounds (custom styling)
- 🔧 Weather/Calendar widgets (custom tools)
- 🔧 Message editor (extend AI Elements)
- 🔧 Web search results display (custom)

## Implementation Steps

### Step 1: Update Chat Page
```tsx
// app/(chat)/chat/[id]/page.tsx
import { Conversation } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput } from '@/components/ai-elements/prompt-input';
```

### Step 2: Migrate Message Rendering
```tsx
// Replace components/messages/messages.tsx
<Conversation>
  {messages.map((message, index) => (
    <Message from={message.role} key={index}>
      <MessageContent>
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <MessageResponse key={i}>{part.text}</MessageResponse>;
            case 'file':
              return <MessageAttachment key={i} file={part} />;
            // ... other part types
          }
        })}
      </MessageContent>
      <MessageActions>
        {/* Add custom copy, edit buttons */}
      </MessageActions>
    </Message>
  ))}
</Conversation>
```

### Step 3: Extend AI Elements Components
Create wrapper components that combine AI Elements with custom features:

```tsx
// components/custom/enhanced-message.tsx
import { Message, MessageContent, MessageActions } from '@/components/ai-elements/message';
import { MessageEditor } from './message-editor';

export function EnhancedMessage({ message, ...props }) {
  return
    <Message {...props}>
      <MessageContent>
        {/* AI Elements content */}
      </MessageContent>
      <MessageActions>
        {/* Other custom actions */}
      </MessageActions>
    </Message>
  );
}
```

## Compatibility Notes

### AI Elements Features:
- ✅ Built on shadcn/ui (already in project)
- ✅ Uses Tailwind CSS (already in project)  
- ✅ Works with AI SDK (already using it)
- ✅ React 19 compatible
- ✅ TypeScript support
- ✅ Fully customizable (code in your repo)

### Breaking Changes:
- ⚠️ Component prop names may differ slightly
- ⚠️ CSS classes may need adjustments
- ⚠️ Some custom features need to be re-implemented

## Testing Checklist

After migration:
- [ ] Message rendering (text, files, code)
- [ ] Message actions (copy, edit, delete)
- [ ] File attachments upload/display
- [ ] Code blocks with syntax highlighting
- [ ] Reasoning/thinking display
- [ ] Tool calls display
- [ ] Suggestions
- [ ] Message branching
- [ ] Streaming messages
- [ ] Mobile responsiveness
- [ ] Dark mode
- [ ] Accessibility

## Rollback Plan

If issues arise:
1. Keep old components in `components/messages-legacy/`
2. Feature flag to switch between old/new
3. Gradual migration per route/feature

## Next Steps

1. ✅ Install AI Elements (DONE)
2. Create wrapper components combining AI Elements + custom features
3. Update one page at a time (start with `/chat/[id]`)
4. Test thoroughly
5. Migrate remaining pages
6. Remove legacy components

## Resources

- [AI Elements Docs](https://ai-sdk.dev/elements)
- [AI Elements Examples](https://ai-sdk.dev/elements/examples/chatbot)
- [Component Source](components/ai-elements/)
