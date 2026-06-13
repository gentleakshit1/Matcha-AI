import { configureStore } from '@reduxjs/toolkit';
import matchaReducer from './matchaSlice';

export const store = configureStore({
  reducer: {
    matcha: matchaReducer, // Registers our slice into the global store tree
  },
});