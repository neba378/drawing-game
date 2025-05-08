# Sketch Guess - Multiplayer Drawing and Guessing Game

A real-time multiplayer drawing and guessing game inspired by skribbl.io, built with Next.js and Socket.IO.

## Features

- **Multiplayer Support**: Join public or private rooms to play with friends
- **Real-time Drawing Canvas**: Draw on a canvas while others watch and guess
- **Chat System**: Real-time chat with guess detection
- **Game Logic**: Random player selection, word choices, timed rounds, and scoring
- **Responsive Design**: Works on both desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js with App Router, React, Tailwind CSS, shadcn/ui
- **Real-time Communication**: Socket.IO
- **Styling**: Tailwind CSS with shadcn/ui components

## Project Structure

\`\`\`
/app                  # Next.js App Router
  /game               # Game page
  /layout.tsx         # Root layout
  /page.tsx           # Home page
/components           # React components
  /game-canvas.tsx    # Drawing canvas
  /chat-box.tsx       # Chat functionality
  /players-list.tsx   # Players and scores
  /game-controls.tsx  # Drawing tools
  /word-selection.tsx # Word selection UI
  /game-timer.tsx     # Round timer
/lib                  # Utility functions
  /socket.ts          # Socket.IO client
/server               # Socket.IO server (separate deployment)
  /index.js           # Game server logic
\`\`\`

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
   \`\`\`bash
   git clone https://github.com/yourusername/sketch-guess.git
   cd sketch-guess
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Create a `.env.local` file with the following variables:
   \`\`\`
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   \`\`\`

4. Start the development server
   \`\`\`bash
   npm run dev
   \`\`\`

5. In a separate terminal, start the Socket.IO server
   \`\`\`bash
   node server/index.js
   \`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Frontend (Next.js)

Deploy the Next.js application to Vercel:

\`\`\`bash
npm run build
vercel deploy
\`\`\`

### Backend (Socket.IO Server)

Deploy the Socket.IO server to a service like Railway, Fly.io, or Heroku:

\`\`\`bash
cd server
# Follow the deployment instructions for your chosen platform
\`\`\`

Remember to update the `NEXT_PUBLIC_SOCKET_URL` environment variable in your Vercel deployment to point to your deployed Socket.IO server.

## Game Flow

1. Players join a room with a nickname
2. Each round, a random player is selected to draw
3. The drawer selects from three random words
4. Other players try to guess the word in the chat
5. Points are awarded based on how quickly players guess correctly
6. After all rounds, a winner is declared based on total points

## License

MIT
