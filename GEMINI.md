# GEMINI.md - Project Context: Tic-Tac-Toe Online

## 📋 Project Overview
This project is a real-time, multiplayer online Tic-Tac-Toe application. It aims to allow two remote players to compete via a shared 6-character session code, without requiring accounts or registration.

**Key Technologies (Planned):**
- **Frontend**: HTML/CSS/JS (Vanilla or React)
- **Backend**: Node.js + Express
- **Real-time Communication**: WebSockets (`ws` or `Socket.io`)
- **State Management**: In-memory server-side storage (Map)

## 📂 Directory Overview
The project is currently in the **Design & Specification Phase**. It contains the foundational documents required for implementation.

### Key Files:
- **`PRD-TicTacToe.md`**: The complete Product Requirements Document. It details the architecture, functional specifications (code generation, game flow, move validation), and UI constraints.
- **`ttt_user_flow.svg`**: A visual representation of the user journey and game states.

## 🛠️ Building and Running (TODO)
As the project is in its early stages, the following commands are placeholders for the intended Node.js implementation:

- **Install dependencies**: `npm install` (TODO: Initialize `package.json`)
- **Start development server**: `npm run dev` (TODO: Configure script)
- **Run tests**: `npm test` (TODO: Set up testing framework)

## 📐 Development Conventions
Based on the `PRD-TicTacToe.md`, the following principles should be followed during development:
- **Server-Side Authority**: All game logic (win detection, turn validation) must be handled by the server. The client should only handle display and user input.
- **Stateless Authentication**: Users are identified solely by their WebSocket connection; no database or session cookies are required.
- **Responsive Design**: The UI must be mobile-first and fully responsive.
- **Minimalist Stack**: Avoid unnecessary dependencies; prefer lightweight libraries like `ws` for WebSockets.

## 🚀 Usage
1. Refer to `PRD-TicTacToe.md` for detailed functional requirements.
2. Use `ttt_user_flow.svg` to guide the implementation of UI states.
3. Start by initializing a Node.js project and setting up the WebSocket server as described in the PRD.
