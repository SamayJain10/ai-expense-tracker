# 💸 AI Expense Tracker

A full-stack mobile app that lets you log expenses using plain English.

Just type:

`Spent 850 on lunch at Taj`

and AI automatically extracts the amount, category, description, and
merchant.

Built as part of a take-home assessment --- completed in \~2 hours using
AI-assisted development.

------------------------------------------------------------------------

# 📱 Demo

📹 Screen Recording

[Demo Video](https://drive.google.com/file/d/1eSn0A59CKTDZkGRwi8LWMKREpOyhsaW9/view?usp=sharing)

The demo shows:

-   Natural language expense input
-   AI parsing and categorization
-   Swipe-to-delete gesture
-   Dark / Light theme toggle
-   Real-time expense list updates

------------------------------------------------------------------------

# ⚙️ Tech Stack

| Layer        | Technology                           |
| ------------ | ------------------------------------ |
| **Mobile**   | React Native, Expo, TypeScript       |
| **Backend**  | Node.js, Express, TypeScript         |
| **Database** | SQLite via `better-sqlite3`          |
| **AI**       | Groq API (`llama-3.3-70b-versatile`) |


------------------------------------------------------------------------

# 🧠 Architecture Overview

Mobile App (React Native)
        │
        │ REST API
        ▼
Express Backend (Node.js)
        │
        │ AI Parsing
        ▼
Groq LLM API
        │
        ▼
SQLite Database

Flow:

1.  User enters expense text
2.  Backend sends text to Groq LLM
3.  LLM returns structured JSON
4.  Backend validates response
5.  Expense stored in SQLite
6.  Mobile UI updates instantly

------------------------------------------------------------------------

# ✨ Features

### Natural Language Expenses

Describe expenses however you want:

```
Uber to airport 450
Netflix subscription 649 
Electricity bill 2300
```

AI automatically extracts structured data.

### AI Categorization

Expenses are categorized automatically into:

-   Food & Dining
-   Transport
-   Shopping
-   Entertainment
-   Bills & Utilities
-   Health
-   Travel
-   Other

### Swipe-to-Delete Gesture

Expenses support a native swipe gesture:

-   swipe left to reveal delete
-   smooth snap animation
-   optimistic UI update
-   automatic collapse animation

### Dark / Light Theme

Animated toggle switches between themes instantly.

### Pull-to-Refresh

Reload the latest expenses anytime.

### Running Total

Header shows live total spending across all expenses.

### Smart Input Suggestions

The UI suggests example commands to guide users:

`Uber to office 350 Netflix subscription 649 Electricity bill 2300`

This improves discoverability for first-time users.

------------------------------------------------------------------------

# 🗂️ Project Structure
```
ai-expense-tracker/
│
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Express app entry point
│   │   ├── database.ts               # SQLite connection + CRUD
│   │   ├── routes/
│   │   │   └── expenses.router.ts    # REST API routes
│   │   └── services/
│   │       └── expenseParser.ts      # Groq AI parsing service
│   │
│   ├── .env.example
│   └── package.json
│
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   │   └── ExpenseTrackerScreen.tsx
│   │   └── config/
│   │       └── api.ts                # API base URL config
│   │
│   ├── App.tsx
│   ├── .env.example
│   └── package.json
│
└── README.md
```
------------------------------------------------------------------------

# 🚀 Getting Started

## Prerequisites

-   Node.js 18+
-   npm or yarn
-   Expo CLI

`npm install -g expo-cli`

-   A free Groq API key

https://console.groq.com

------------------------------------------------------------------------

# 1️⃣ Clone the Repository

```
git clone https://github.com/SamayJain10/ai-expense-tracker.git
cd ai-expense-tracker `
```

------------------------------------------------------------------------

# 2️⃣ Backend Setup

```
cd backend 
npm install 
cp .env.example .env
```

Edit `.env`:

```
GROQ_API_KEY=gsk_your_key_here 
PORT=3000 
DB_PATH=./expenses.db
```

Start the backend server:

`npm run dev`

Server will run at:

`http://localhost:3000`

Test:

`curl http://localhost:3000/health`

Response:

`{ "status": "ok" }`

------------------------------------------------------------------------

# 3️⃣ Mobile Setup

```
cd mobile 
npm install 
cp .env.example .env
```

Edit `.env`:

`EXPO_PUBLIC_API_URL=http://192.168.1.x:3000`

Do NOT use localhost when testing on a phone.

Use your local network IP.

Find it with:

```
Windows: ipconfig 
Mac/Linux: ifconfig
```

Start the mobile app:

`npx expo start`

Then:

-   Scan QR using Expo Go
-   Press i for iOS simulator
-   Press a for Android emulator

------------------------------------------------------------------------

# 🔌 API Reference

## POST /api/expenses

Request

{ "input": "Uber to airport 450" }

Response


{ "success": true, "data": { "id": 1, "amount": 450, "currency": "INR",
"category": "Transport", "description": "Uber to airport", "merchant":
"Uber", "original_input": "Uber to airport 450", "created_at":
"2025-01-20T10:00:00Z" } }


------------------------------------------------------------------------

## GET /api/expenses

Returns all expenses (newest first).

------------------------------------------------------------------------

## DELETE /api/expenses/:id

Deletes an expense.

------------------------------------------------------------------------

# 🤖 AI Prompt Design

The Groq API call uses:

-   temperature: 0 for deterministic results
-   response_format: json_object for guaranteed JSON output

The system prompt enforces:

-   strict schema output
-   limited category set
-   structured error responses

This keeps backend validation simple and avoids complex parsing logic.

------------------------------------------------------------------------

# ⚠️ Error Handling

Two error types are used:

ExpenseParseError → user input cannot be parsed\
Error → infrastructure or API failures

This allows the API to return:

400 → invalid expense input\
500 → server failure

------------------------------------------------------------------------

# ⏱️ Time Breakdown

| Task                    | Time         |
| ----------------------- | ------------ |
| Project setup           | 15 min       |
| Database + CRUD         | 10 min       |
| AI parsing service      | 15 min       |
| Express routes          | 10 min       |
| React Native screen     | 30 min       |
| Dark theme              | 15 min       |
| Swipe-to-delete gesture | 10 min       |
| Testing & polish        | 15 min       |
| **Total**               | **~2 hours** |


------------------------------------------------------------------------

# 🔮 What I'd Add With More Time

-   Monthly spending charts
-   Edit expense inline
-   AsyncStorage persistence for theme preference
-   Search and filtering
-   CSV export
-   Receipt OCR parsing

------------------------------------------------------------------------

# 🛠️ AI Tools Used

Claude (Anthropic)

Used for: - system design - code generation - debugging - UI
improvements

Cursor

Used for: - inline autocomplete - fast code iteration

Most effective prompt pattern:

Provide TypeScript interfaces first, then ask the model to implement
around them.

------------------------------------------------------------------------

# 📜 License

MIT License

Feel free to fork, extend, and build upon this project.
