import { createSlice } from '@reduxjs/toolkit';
const adminSlice = createSlice({ name: 'admin', initialState: { pendingUsers: 7, activePlans: 128, missedItems: 14, products: 23 }, reducers: {} });
export default adminSlice.reducer;

