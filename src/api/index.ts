const API_URL = 'https://train-diary-backend.vercel.app/api';

let token: string | null = localStorage.getItem('token');

export const setToken = (newToken: string) => {
  token = newToken;
  localStorage.setItem('token', newToken);
};

const getHeaders = (isJson = true) => ({
  ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  Accept: 'application/json',
  ...(token || localStorage.getItem('token')
    ? { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
    : {}),
});

// --- AUTHENTICATION ---
export const login = (data: any) =>
  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const register = (data: any) =>
  fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// --- EXERCISES ---
export const getExercises = () =>
  fetch(`${API_URL}/exercises`, { headers: getHeaders() }).then(res => res.json());

export const addExercise = (data: any) =>
  fetch(`${API_URL}/exercises`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const deleteExercise = (exercise_id: string) =>
  fetch(`${API_URL}/exercises`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ exercise_id }),
  }).then(res => res.json());

// --- FOODS ---
export const getFoods = (food_id?: number) =>
  fetch(`${API_URL}/foods${food_id ? `?food_id=${food_id}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());

export const addFood = (data: any) =>
  fetch(`${API_URL}/foods`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const updateFood = (data: any) =>
  fetch(`${API_URL}/foods`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const deleteFood = (food_id: number) =>
  fetch(`${API_URL}/foods`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ food_id }),
  }).then(res => res.json());

// --- FOOD LOGS ---
export const getFoodLogs = (meal_id?: number) =>
  fetch(`${API_URL}/food-logs${meal_id ? `?meal_id=${meal_id}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());

export const addFoodLog = (data: any) =>
  fetch(`${API_URL}/food-logs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const updateFoodLog = (data: any) =>
  fetch(`${API_URL}/food-logs`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const deleteFoodLog = (meal_id: number) =>
  fetch(`${API_URL}/food-logs`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ meal_id }),
  }).then(res => res.json());

// --- WORKOUT PLANS ---
export const getWorkoutPlans = (plan_id?: number) =>
  fetch(`${API_URL}/workout-plans${plan_id ? `?plan_id=${plan_id}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());

export const applyWorkoutPlan = (data: any) =>
  fetch(`${API_URL}/workout-plans`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// --- WORKOUT SESSIONS ---
export const getWorkoutSessions = (params: { user_id?: number; session_id?: number }) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return fetch(`${API_URL}/workout-sessions${query ? `?${query}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());
};

export const createWorkoutSession = (data: any) =>
  fetch(`${API_URL}/workout-sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const markSessionCompleted = (session_id: number) =>
  fetch(`${API_URL}/workout-sessions`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ session_id }),
  }).then(res => res.json());

export const deleteWorkoutSession = (data: any) =>
  fetch(`${API_URL}/workout-sessions`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// --- SUMMARY ---
export const getSummary = (params: {
  user_id: number;
  start_date: string;
  end_date: string;
}) => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();

  return fetch(`${API_URL}/summary?${query}`, {
    headers: getHeaders(),
  }).then(res => res.json());
};
