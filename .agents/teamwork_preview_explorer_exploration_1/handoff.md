# Frontend Application Exploration & Test Strategy Report

## 1. Observation

### 1.1 Directory Structure & Architecture
- **Location**: `frontend-new/` within project root `C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool`.
- **Key Subdirectories**:
  - `client/`: Primary React SPA source.
    - `client/pages/`: 13 page components (`Auth.tsx`, `Index.tsx` [Dashboard], `InterviewSelect.tsx`, `InterviewRoom.tsx`, `IntroSelect.tsx`, `IntroPracticeRoom.tsx`, `IntroResult.tsx`, `IntroDetail.tsx`, `MyHistory.tsx`, `Progress.tsx`, `AdminAnalytics.tsx`, `Documents.tsx`, `NotFound.tsx`).
    - `client/components/`: Modular UI split into `layout/` (`MainLayout.tsx`, `Sidebar.tsx`, `TopNav.tsx`), `dashboard/` (`ContinueCard.tsx`, `ProgressWidget.tsx`, `RecommendationCard.tsx`), `interview/` (`VideoPanel.tsx`, `ControlBar.tsx`, `CopilotPanel.tsx`, `VisionOverlay.tsx`, `EvaluationLoadingScreen.tsx`), `DocumentViewer.tsx`, and `ui/` (Radix UI primitives wrapped in Tailwind).
    - `client/hooks/`: Custom React hooks (`use-mobile.tsx`, `use-pipeline.ts`, `use-toast.ts`, `useHuggingFaceVision.ts`, `useMediaStream.ts`, `useVisionSessionAnalytics.ts`).
    - `client/lib/`: Core service & state utilities:
      - `AuthContext.tsx` & `auth.ts`: Authentication state provider using `localStorage` (`session_id`, `candidate_name`, `candidate_email`, `api_provider`) and cookie management (`wbl_access_token`).
      - `ThemeContext.tsx`: Theme state management (dark mode support).
      - `api.ts`: Central fetch wrapper configured with `BASE_URL` (`import.meta.env.VITE_API_URL` or `http://127.0.0.1:8000`), automatic Bearer token injection, 401 redirection, and API endpoints for auth, setup, intro evaluation, project explanation, mock interviews, and analytics.
      - `indexedDB.ts`: IndexedDB helper (`AiPrepMediaDB`) managing raw recording drafts and approved uploads.
      - `utils.ts` & `utils.spec.ts`: Classname utility (`cn`) and unit tests.
  - `server/`: Lightweight Express server (`server/index.ts`, `server/node-build.ts`) integrated as a Vite plugin middleware in dev mode and compiled via `vite.config.server.ts` for production.
  - `shared/`: Shared TypeScript type definitions across client and server.
  - `public/`: Static files and service worker (`sw-youtube.js` for background video uploads).

### 1.2 Routing & Navigation
- Defined in `client/App.tsx` using `react-router-dom` (`<BrowserRouter>`, `<Routes>`, `<Route>`).
- `<RequireAuth>` route guard checks `isAuthenticated` state from `AuthContext` and blocks unauthenticated navigation.
- `<SsoSync>` automatically validates session against `/api/candidate/me`.

### 1.3 Testing Setup & Test Guidelines
- **Runner**: `vitest` v4.1.0 configured in `package.json` (`"test": "vitest --run"`).
- **Existing Test File**: `client/lib/utils.spec.ts` (5 unit tests for `cn` utility function).
- **Documentation**: Located in `frontend-new/test.md/`:
  - `test.md/tests.md`: Principles for **Good vs Bad tests**. Emphasizes integration-style testing: testing observable behavior through public interfaces rather than implementation details or mocking internal collaborators.
  - `test.md/mocking.md`: Rules for mocking only at **system boundaries** (external APIs, databases, time) using dependency injection or SDK interfaces, rather than mocking internal classes/components.
  - `test.md/deep-modules.md`: Philosophy of Deep Modules (small interface, deep implementation).
  - `test.md/interface-design.md`: Designing for testability.
  - `test.md/SKILL.md`: Comprehensive QA process architecture (AAA pattern, OWASP, metrics tracking).

### 1.4 Verification & Build Execution Commands
- `npm test`: Executed `vitest --run`, passed 5/5 tests in `client/lib/utils.spec.ts` (1.86s duration).
- `npm run build`: Executed client build (`vite build` -> `dist/spa/`) and server build (`vite build --config vite.config.server.ts` -> `dist/server/node-build.mjs`), completed successfully without errors.
- `npm run typecheck`: Executed `tsc`, completed with 0 TypeScript errors.

---

## 2. Logic Chain

1. **System & Architecture Analysis**:
   - The application is a React 18 single page application powered by Vite, Tailwind CSS, Radix UI, `@tanstack/react-query`, and React Router v6.
   - Server communication is encapsulated in `client/lib/api.ts`, which uses standard `fetch` with `Bearer` tokens.
   - Authentication is managed via `AuthContext` and stored in `localStorage` + `wbl_access_token` cookies.

2. **Test Setup & Guideline Alignment**:
   - `vitest` is installed and functioning for unit tests (`utils.spec.ts`).
   - The team's testing philosophy is documented in `frontend-new/test.md/tests.md` and `mocking.md`.
   - **Key Requirement**: Tests must follow **integration-style principles**. Instead of shallow rendering components and asserting internal state (`component.state.isSubmitDisabled`) or verifying internal props passed to child components (`expect(ControlBar).toHaveBeenCalledWith(...)`), tests must verify real user behavior and observable DOM changes.

3. **Integration Testing Implementation Roadmap**:
   - **Environment**: Currently, Vitest runs in default node environment. For UI integration tests, `jsdom` or `happy-dom` alongside `@testing-library/react` and `@testing-library/user-event` should be added to `package.json`.
   - **Boundary Mocking**: Network requests should be mocked using `MSW` (Mock Service Worker) or `vi.fn()` on `global.fetch` at the network boundary, matching the principles in `mocking.md`. Component internal helpers and child components should NOT be mocked.
   - **Provider Wrapping**: Page-level integration tests will render pages wrapped with real providers (`QueryClientProvider`, `AuthProvider`, `MemoryRouter`) to test natural page workflows (e.g., auth check -> navigate -> fill form -> trigger API -> display result).

---

## 3. Caveats

- **Missing DOM Testing Library**: `@testing-library/react` and `jsdom`/`happy-dom` are not currently listed in `frontend-new/package.json` devDependencies. React component tests requiring a Virtual DOM will require adding these dependencies.
- **Media API Browser Stubs**: Certain browser APIs used in pages (`navigator.mediaDevices.getUserMedia`, `MediaRecorder`, `indexedDB`, `serviceWorker`) are browser-native and will require minimal polyfills/mocks when running under headless Node/jsdom test environment.
- **Read-Only Constraint**: As an explorer subagent, no modifications were made to project code files. All findings are purely observational and documented herein.

---

## 4. Conclusion

The `frontend-new` project has a clear layout, routing structure, state model, and API layer. The build and typecheck pipelines are completely healthy. The existing test runner (`vitest`) works out of the box, and comprehensive integration testing guidelines are already authored in `frontend-new/test.md/`. Adding DOM testing dependencies (`@testing-library/react`, `jsdom`) and network mocking (`msw`) will enable writing integration-style tests that adhere strictly to the project's testing standards.

---

## 5. Verification Method

To verify the findings and commands independently:

1. **Verify Test Runner Execution**:
   ```bash
   cd "C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\frontend-new"
   npm test
   ```
   *Expected result*: Vitest runs and executes `client/lib/utils.spec.ts` passing 5 tests.

2. **Verify Typecheck**:
   ```bash
   cd "C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\frontend-new"
   npm run typecheck
   ```
   *Expected result*: `tsc` exits with status code 0 and no error messages.

3. **Verify Build**:
   ```bash
   cd "C:\Users\Adarsh Teja\Desktop\ai_prep_tool\project-ai-prep-tool\frontend-new"
   npm run build
   ```
   *Expected result*: Successfully outputs client SPA bundle to `dist/spa` and server bundle to `dist/server`.
