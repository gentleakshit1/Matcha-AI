import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeJdId: null,
  activeJdTitle: '',
  evaluationResult: null,
  loading: false,
  error: null
};

export const matchaSlice = createSlice({
  name: 'matcha',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setJdSuccess: (state, action) => {
      state.loading = false; // <-- CRUCIAL: Add this line to turn off the loading banner!
      state.jdResult = action.payload;
      state.error = null;
    },
    setEvaluationSuccess: (state, action) => {
      // Stores the massive AI payload returned by our upload_resume_view API
      state.evaluationResult = action.payload;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

// Export the action functions so our React components can trigger them
export const { setLoading, setJdSuccess, setEvaluationSuccess, setError } = matchaSlice.actions;

export default matchaSlice.reducer;