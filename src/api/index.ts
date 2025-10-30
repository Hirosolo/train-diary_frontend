const API_URL = 'https://train-diary-backend.vercel.app/';

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
// Base Exercise interface
interface Exercise {
  exercise_id?: number;
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
// Types for workout session operations
interface CreateSessionRequest {
  user_id: number;
  scheduled_date: string; // YYYY-MM-DD
  type?: string;
  notes?: string;
}

interface WorkoutSessionExercise {
  exercise_id: number;
  planned_sets: number;
  planned_reps: number;
}

interface AddExercisesRequest {
  session_id: number;
  exercises: WorkoutSessionExercise[];
}

interface WorkoutLog {
  actual_sets: number;
  actual_reps: number;
  weight_kg?: number;
  duration_seconds?: number;
  notes?: string;
}

interface LogWorkoutRequest {
  session_detail_id: number;
  log: WorkoutLog;
}

// Union type for all possible request types
type WorkoutSessionRequest = CreateSessionRequest | AddExercisesRequest | LogWorkoutRequest;

interface WorkoutSessionResponse {
  message?: string;
  session_id?: number;
  detail_id?: number;
}

export const getWorkoutSessions = (params: { user_id?: number; session_id?: number }): Promise<any> => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return fetch(`${API_URL}/workout-sessions${query ? `?${query}` : ''}`, {
    headers: getHeaders(),
  }).then(res => res.json());
};

// Helper function to determine which case we're handling
const isCreateSession = (data: WorkoutSessionRequest): data is CreateSessionRequest => {
  return 'user_id' in data && 'scheduled_date' in data;
};

const isAddExercises = (data: WorkoutSessionRequest): data is AddExercisesRequest => {
  return 'session_id' in data && 'exercises' in data;
};

const isLogWorkout = (data: WorkoutSessionRequest): data is LogWorkoutRequest => {
  return 'session_detail_id' in data && 'log' in data;
};

export const createWorkoutSession = (data: WorkoutSessionRequest): Promise<WorkoutSessionResponse> => {
  // Type guard to ensure we're sending the correct data structure
  if (!isCreateSession(data) && !isAddExercises(data) && !isLogWorkout(data)) {
    return Promise.reject(new Error('Invalid request data structure'));
  }

  return fetch(`${API_URL}/workout-sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());
};

// Helper function specifically for adding exercises to a session (Case 2)
export const addExercisesToSession = (
  session_id: number, 
  data: { exercises: WorkoutSessionExercise[] }
): Promise<WorkoutSessionResponse> => {
  return createWorkoutSession({
    session_id,
    exercises: data.exercises
  });
};

export const markSessionCompleted = (session_id: number): Promise<WorkoutSessionResponse> =>
  fetch(`${API_URL}/workout-sessions`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ session_id }),
  }).then(res => res.json());

export const deleteWorkoutSession = (session_id: number): Promise<WorkoutSessionResponse> =>
  fetch(`${API_URL}/workout-sessions`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ session_id }),
  }).then(res => res.json());

// --- SUMMARY ---
