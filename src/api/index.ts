const API_URL = 'http://localhost:3000/api';

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

// Types based on API documentation
interface LoginRequest {
  email: string;
  password: string;
}

// --- AUTHENTICATION ---
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message?: string;
  token?: string;
}

export const login = (data: LoginRequest): Promise<LoginResponse> =>
  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  message?: string;
  token?: string;
}

export const register = (data: RegisterRequest): Promise<RegisterResponse> =>
  fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// --- EXERCISES ---
interface Exercise {
  exercise_id?: string;
  name: string;
  category?: string;
  default_sets?: number;
  default_reps?: number;
  description?: string;
}

interface ExerciseResponse {
  exercises?: Exercise[];
  message?: string;
}

export const getExercises = (): Promise<ExerciseResponse> =>
  fetch(`${API_URL}/exercises`, { headers: getHeaders() }).then(res => res.json());

interface ExerciseCreateResponse {
  exercise_id: string;
  message: string;
}

export const addExercise = (data: Exercise): Promise<ExerciseCreateResponse> =>
  fetch(`${API_URL}/exercises`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

interface ExerciseDeleteResponse {
  message: string;
}

export const deleteExercise = (exercise_id: string): Promise<ExerciseDeleteResponse> =>
  fetch(`${API_URL}/exercises`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ exercise_id }),
  }).then(res => res.json());

// --- FOODS ---
interface Food {
  food_id?: number;
  name: string;
  calories_per_serving?: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  serving_type: string;
  image?: string;
}

interface FoodResponse {
  foods?: Food[];
  food?: Food;
  message?: string;
}

export const getFoods = (food_id?: number): Promise<FoodResponse> =>
  fetch(`${API_URL}/foods${food_id ? `?food_id=${food_id}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());

interface FoodCreateResponse {
  food_id: number;
  message: string;
}

export const addFood = (data: Food): Promise<FoodCreateResponse> =>
  fetch(`${API_URL}/foods`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

interface FoodUpdateResponse {
  message: string;
}

export const updateFood = (data: Food & { food_id: number }): Promise<FoodUpdateResponse> =>
  fetch(`${API_URL}/foods`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

interface FoodDeleteResponse {
  message: string;
}

export const deleteFood = (food_id: number): Promise<FoodDeleteResponse> =>
  fetch(`${API_URL}/foods`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ food_id }),
  }).then(res => res.json());

// --- SUMMARY ---
interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: number;
  gr_score: number;
}

interface Summary {
  total_workouts: number;
  total_calories_intake: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  total_duration_minutes: number;
  total_gr_score: number;
  avg_gr_score: number;
  dailyData: DailyData[];
}

interface GenerateSummaryRequest {
  user_id: number;
  period_type: 'monthly';
  period_start: string;
}

interface GenerateSummaryResponse {
  message: string;
  success: boolean;
}

export const generateSummary = (params: GenerateSummaryRequest): Promise<GenerateSummaryResponse> => {
  return fetch(`${API_URL}/summary`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  }).then(res => res.json());
};

export const getSummary = (params: GenerateSummaryRequest): Promise<Summary> => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();

  return fetch(`${API_URL}/summary?${query}`, {
    headers: getHeaders(),
  }).then(res => res.json());
};

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
