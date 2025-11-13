# Chat App Assignment (minimal)
Contains two folders: /server (Node + Express + Socket.IO + Mongo) and /mobile (minimal React Native App).

## Setup - Server
1. Install Node.js and MongoDB.
2. cd server
3. copy .env.example to .env and set MONGO_URI & JWT_SECRET
4. npm install
5. npm start
Server runs on PORT (default 4000).

## Setup - Mobile (Expo recommended)
1. cd mobile
2. npm install
3. Start with Expo or your React Native setup
4. Edit API url in App.js if running server on a device/emulator.

## Deliverables included
- Minimal server with auth endpoints and Socket.IO handlers (message send/new, typing, read)
- Minimal mobile App demonstrating login, user list, and socket connection
- .env.example and package.json files
- This README

## Notes / Next steps (to reach full requirements)
- Wire conversation IDs and persist conversation metadata client-side
- Improve UI, message bubble components, timestamps
- Add delivery/read tick UI states (emit/receive message:delivered and message:read)
- Add typing UX and online/offline indicators in user list
- Create sample users script or seed data
