# 🎮 UpScramble

An ultra-responsive, offline-first word scramble puzzle and anagram matrix game built with React 19, Vite 6, TypeScript, Tailwind CSS, and Framer Motion.

---

## ✨ Features

- **⚡ Fast-Paced Gameplay**: Form accepted words from a pool of dynamic letter tiles with rainbow styling, smooth physics, and top-center responsive toast feedback.
- **🎯 Dynamic Word Lengths & Persistence**: Play single-length rounds (3L, 4L, 5L, etc.) or multi-length hybrid challenges (3L–10L). Your last selected setup automatically persists across tab visits and page reloads.
- **🎲 Random Setup Generator**: Tap "Random Setup" or "Roll Random Setup" to instantly generate random word lengths, modes, and durations.
- **🛡️ Pre-Game Setup Review**: Built-in modal confirmation allowing players to review and verify all settings before launching a round.
- **⏱️ Flexible Modes & Game Terminator**:
  - **Timed Rush**: Race against the clock with progressive multiplier decay, speed bonuses, and dynamic board refills.
  - **Untimed / Big Matrix Puzzle**: Expanded letter grid (up to 64 letters). Features an intelligent terminator engine that detects when no more valid words can possibly be created from remaining tiles to trigger smooth puzzle completion.
- **📲 Full PWA & iOS Safari Optimization**:
  - Offline dictionary precaching (`/words/*.txt` for lengths 3 through 10) backed by IndexedDB and Workbox.
  - Step-by-step iOS "Add to Home Screen" installation tutorial with cooldown logic.
  - `viewport-fit=cover` and safe-area inset protection eliminating white status-bar rubberbanding on iPhones.
  - Custom neon glassmorphic PWA and favicon icons.
- **📤 Wordle-Style Social Sharing**:
  - Share game invitations and export emoji score cards (Wordle grid format) summarizing score, word discovery, and streak directly to social apps or clipboard.
- **🖼️ Iframe & Standalone Ready**:
  - Fully self-contained — designed to run standalone or embedded inside another game without cross-frame interference.
- **⌨️ Hardware Keyboard Support**:
  - Physical desktop keyboard typing for rapid-fire play (`Enter` to submit, `Backspace` to delete, `Space` to shuffle, `Esc` to clear, letters to stage).
- **💾 Safe Local Persistence**:
  - Session history, streak tracking, active game resume, and preferences backed by resilient LocalStorage and IndexedDB gateways.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm / yarn

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/upscramble.git
cd upscramble

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to start playing.

### Production Build & Preview
```bash
# Type check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Running Tests
```bash
# Run Vitest test suite
npm run test
```

---

## 🕹️ Embedding via Iframe

UpScramble can be embedded in any parent website or game:

```html
<iframe
  src="https://your-upscramble-url.com/"
  title="UpScramble"
  width="100%"
  height="100%"
  style="border: none; min-height: 600px;"
  allow="autoplay; fullscreen"
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
></iframe>
```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) & [Canvas Confetti](https://github.com/catdad/canvas-confetti)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) + React Hooks / Reducers
- **Storage**: Safe Fallback IndexedDB (`idb`) & LocalStorage
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox Stale-While-Revalidate)
- **Testing**: [Vitest](https://vitest.dev/) + Testing Library

---

## 📄 License

This project is licensed under the MIT License.
