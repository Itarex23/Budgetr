# Budgetr

A simple, private budget tracker built Nigerian-first. It tells you one number: **how much you can safely spend today.**

All data stays on your phone. No accounts, no backend. *Built by Itarex*

## Features

- **Safe-to-spend** daily number, with unpaid bills set aside first
- **Expenses**: add, edit, delete, plus a month-to-month comparison
- **Recurring bills** with mark-as-paid and overdue alerts
- **Categories**: essential vs discretionary
- **Daily pacing**: even, weekday pattern, front-load or back-load
- **Rollover** of leftover budget, multi-currency (₦ default), PIN lock, daily reminder
- **Export** to CSV or JSON

## Tech

Expo SDK 58, React Native 0.88, TypeScript, Expo Router, AsyncStorage (pinned to `2.2.0`, the version Expo SDK 58 supports).

## Run it

```bash
npm install
npx expo start -c
```

Scan the QR code with Expo Go.

## Build an Android APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
