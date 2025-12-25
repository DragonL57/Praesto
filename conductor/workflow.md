# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation
3. **Lint-First Development:** Use `biome lint` and `biome format` to ensure code quality and consistency from the start.
4. **Strict Type Safety:** Ensure all code is strictly typed with TypeScript. Run `tsc --noEmit` to verify type safety.
5. **User Experience First:** Every decision should prioritize user experience
6. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools (linters) to ensure single execution.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1. **Select Task:** Choose the next available task from `plan.md` in sequential order

2. **Mark In Progress:** Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`

3. **Implement Feature/Fix:**
   - Write the application code necessary to fulfill the task requirements.
   - Adhere to the project's code style guidelines.

4. **Verify Quality (Lint & Type Check):**
   - Run `pnpm run lint` (or equivalent) to ensure there are no linting or formatting errors.
   - Run `pnpm exec tsc --noEmit` to ensure type safety.
   - **CRITICAL:** Fix all errors before proceeding.

5. **Refactor (Optional but Recommended):**
   - Refactor the implementation code to improve clarity, remove duplication, and enhance performance.
   - Rerun linting and type checks to ensure no regressions were introduced.

6. **Document Deviations:** If implementation differs from tech stack:
   - **STOP** implementation
   - Update `tech-stack.md` with new design
   - Add dated note explaining the change
   - Resume implementation

7. **Commit Code Changes:**
   - Stage all code changes related to the task.
   - Propose a clear, concise commit message e.g, `feat(ui): Create basic HTML structure for calculator`.
   - Perform the commit.

8. **Attach Task Summary with Git Notes:**
   - **Step 8.1: Get Commit Hash:** Obtain the hash of the *just-completed commit* (`git log -1 --format="%H"`).
   - **Step 8.2: Draft Note Content:** Create a detailed summary for the completed task. This should include the task name, a summary of changes, a list of all created/modified files, and the core "why" for the change.
   - **Step 8.3: Attach Note:** Use the `git notes` command to attach the summary to the commit.
     ```bash
     # The note content from the previous step is passed via the -m flag.
     git notes add -m "<note content>" <commit_hash>
     ```

9. **Get and Record Task Commit SHA:**
    - **Step 9.1: Update Plan:** Read `plan.md`, find the line for the completed task, update its status from `[~]` to `[x]`, and append the first 7 characters of the *just-completed commit's* commit hash.
    - **Step 9.2: Write Plan:** Write the updated content back to `plan.md`.

10. **Commit Plan Update:**
    - **Action:** Stage the modified `plan.md` file.
    - **Action:** Commit this change with a descriptive message (e.g., `conductor(plan): Mark task 'Create user model' as complete`).

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after a task is completed that also concludes a phase in `plan.md`.

1.  **Announce Protocol Start:** Inform the user that the phase is complete and the verification and checkpointing protocol has begun.

2.  **Verify Quality Across Phase Changes:**
    -   **Step 2.1: Lint & Format Check:** Run `pnpm run lint` and `pnpm run format` to ensure all phase changes adhere to project standards.
    -   **Step 2.2: Type Safety Check:** Run `pnpm exec tsc --noEmit` to ensure no type regressions were introduced.

3.  **Propose a Detailed, Actionable Manual Verification Plan:**
    -   **CRITICAL:** To generate the plan, first analyze `product.md`, `product-guidelines.md`, and `plan.md` to determine the user-facing goals of the completed phase.
    -   You **must** generate a step-by-step plan that walks the user through the verification process, including any necessary commands and specific, expected outcomes.
    -   The plan you present to the user **must** follow this format:

        **For a Frontend Change:**
        ```
        The linting and type checks have passed. For manual verification, please follow these steps:

        **Manual Verification Steps:**
        1.  **Start the development server with the command:** `pnpm run dev`
        2.  **Open your browser to:** `http://localhost:3000`
        3.  **Confirm that you see:** The new user profile page, with the user's name and email displayed correctly.
        ```

        **For a Backend Change:**
        ```
        The linting and type checks have passed. For manual verification, please follow these steps:

        **Manual Verification Steps:**
        1.  **Ensure the server is running.**
        2.  **Execute the following command in your terminal:** `curl -X POST http://localhost:8080/api/v1/users -d '{"name": "test"}'`
        3.  **Confirm that you receive:** A JSON response with a status of `201 Created`.
        ```

4.  **Await Explicit User Feedback:**
    -   After presenting the detailed plan, ask the user for confirmation: "**Does this meet your expectations? Please confirm with yes or provide feedback on what needs to be changed.**"
    -   **PAUSE** and await the user's response. Do not proceed without an explicit yes or confirmation.

5.  **Create Checkpoint Commit:**
    -   Stage all changes. If no changes occurred in this step, proceed with an empty commit.
    -   Perform the commit with a clear and concise message (e.g., `conductor(checkpoint): Checkpoint end of Phase X`).

6.  **Attach Auditable Verification Report using Git Notes:**
    -   **Step 6.1: Draft Note Content:** Create a detailed verification report including the manual verification steps and the user's confirmation.
    -   **Step 6.2: Attach Note:** Use the `git notes` command and the full commit hash from the previous step to attach the full report to the checkpoint commit.

7.  **Get and Record Phase Checkpoint SHA:**
    -   **Step 7.1: Get Commit Hash:** Obtain the hash of the *just-created checkpoint commit* (`git log -1 --format="%H"`).
    -   **Step 7.2: Update Plan:** Read `plan.md`, find the heading for the completed phase, and append the first 7 characters of the commit hash in the format `[checkpoint: <sha>]`.
    -   **Step 7.3: Write Plan:** Write the updated content back to `plan.md`.

8. **Commit Plan Update:**
    - **Action:** Stage the modified `plan.md` file.
    - **Action:** Commit this change with a descriptive message following the format `conductor(plan): Mark phase '<PHASE NAME>' as complete`.

9.  **Announce Completion:** Inform the user that the phase is complete and the checkpoint has been created, with the detailed verification report attached as a git note.

### Quality Gates

Before marking any task complete, verify:

- [ ] Code follows project's code style guidelines (as defined in `code_styleguides/`)
- [ ] No linting or static analysis errors (using `biome lint`)
- [ ] No type safety errors (using `tsc --noEmit`)
- [ ] All public functions/methods are documented (e.g., JSDoc)
- [ ] Works correctly on mobile (if applicable)
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced

## Development Commands

### Setup
```bash
pnpm install
```

### Daily Development
```bash
pnpm run dev
pnpm run lint
pnpm exec tsc --noEmit
```

### Before Committing
```bash
pnpm run lint
pnpm run format
pnpm exec tsc --noEmit
```

## Quality Standards

### Linting & Formatting
- Use Biome for all linting and formatting.
- Fix all "recommended" and "error" level linting issues.
- Ensure all files are formatted consistently.

### Type Safety
- Ensure all new code is fully typed.
- Avoid the use of `any` where possible.
- Use interfaces and types to define data structures.

### Mobile Testing
- Test on actual iPhone when possible
- Use Safari developer tools
- Test touch interactions
- Verify responsive layouts
- Check performance on 3G/4G

## Code Review Process

### Self-Review Checklist
Before requesting review:

1. **Functionality**
   - Feature works as specified
   - Edge cases handled
   - Error messages are user-friendly

2. **Code Quality**
   - Follows style guide
   - DRY principle applied
   - Clear variable/function names
   - Appropriate comments

3. **Quality Assurance**
   - No linting or formatting errors
   - No type errors
   - Manual verification plan successful

4. **Security**
   - No hardcoded secrets
   - Input validation present
   - SQL injection prevented
   - XSS protection in place

5. **Performance**
   - Database queries optimized
   - Images optimized
   - Caching implemented where needed

6. **Mobile Experience**
   - Touch targets adequate (44x44px)
   - Text readable without zooming
   - Performance acceptable on mobile
   - Interactions feel native

## Commit Guidelines
...
## Definition of Done

A task is complete when:

1. All code implemented to specification
2. Code passes all linting and static analysis checks (Biome)
3. Code passes type safety checks (TSC)
4. Manual verification successful
5. Documentation complete (if applicable)
6. Works beautifully on mobile (if applicable)
7. Implementation notes added to `plan.md`
8. Changes committed with proper message
9. Git note with task summary attached to the commit

## Emergency Procedures
...
## Deployment Workflow

### Pre-Deployment Checklist
- [ ] No linting errors
- [ ] No type errors
- [ ] Manual verification complete
- [ ] Mobile testing complete
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup created

### Deployment Steps
1. Merge feature branch to main
2. Tag release with version
3. Push to deployment service
4. Run database migrations
5. Verify deployment
6. Test critical paths
7. Monitor for errors

### Post-Deployment
1. Monitor analytics
2. Check error logs
3. Gather user feedback
4. Plan next iteration

## Continuous Improvement

- Review workflow weekly
- Update based on pain points
- Document lessons learned
- Optimize for user happiness
- Keep things simple and maintainable
