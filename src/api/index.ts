export const API_URL = "http://localhost:3000/api";
import { notifyError, notifySuccess } from "../context/notify";

let token: string | null = localStorage.getItem("token");

export const setToken = (newToken: string) => {
  token = newToken;
  localStorage.setItem("token", newToken);
};

const getHeaders = (isJson = true) => ({
  ...(isJson ? { "Content-Type": "application/json" } : {}),
  Accept: "application/json",
  "Access-Control-Allow-Credentials": "true",
  ...(token || localStorage.getItem("token")
    ? { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
    : {}),
});

// Unified request helper with error handling and notification
async function request<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit & { successMessage?: string }
): Promise<T> {
  try {
    const { successMessage, ...opts } = init || {};
    const res = await fetch(input, opts);

    const contentType = res.headers.get("content-type") || "";
    let body: any = null;
    try {
      body = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch (_) {
      body = null;
    }

    if (!res.ok) {
      const backendMessage = body && (body.message || body.error);
      const message = backendMessage
        ? String(backendMessage)
        : `The request failed (code ${res.status}). Please try again. If this keeps happening, contact support.`;
      notifyError(message);
      throw new Error(message);
    }

    if (successMessage) {
      notifySuccess(successMessage);
    }

    return body as T;
  } catch (err: any) {
    let message =
      "We could not connect to the server. Please check your connection and try again. If the issue persists, contact support.";
    if (err && err.message) {
      const lower = String(err.message).toLowerCase();
      if (
        lower.includes("failed to fetch") ||
        lower.includes("network") ||
        lower.includes("load")
      ) {
        // keep friendly copy above
      } else {
        // For other unexpected errors, still show friendly message but append short code
        message = `${message} (Details: ${err.message})`;
      }
    }
    notifyError(message);
    throw err instanceof Error ? err : new Error(message);
  }
}

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
  user?: {
    user_id: number;
    username: string;
    email: string;
  };
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  return request<LoginResponse>(`${API_URL}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
};

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
  request<RegisterResponse>(`${API_URL}/auth/register`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

// --- EXERCISES ---
export interface Exercise {
  exercise_id: number;
  name: string;
  category?: string;
  default_sets?: number;
  default_reps?: number;
  description?: string;
}

interface ExerciseResponse {
  exercises: Exercise[];
  message?: string;
}

export const getExercises = (): Promise<ExerciseResponse> =>
  request<ExerciseResponse>(`${API_URL}/exercises`, { headers: getHeaders() });

interface ExerciseCreateResponse {
  exercise_id: string;
  message: string;
}

export const addExercise = (data: Exercise): Promise<ExerciseCreateResponse> =>
  request<ExerciseCreateResponse>(`${API_URL}/exercises`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    successMessage: "Exercise added",
  });

interface ExerciseDeleteResponse {
  message: string;
}

export const deleteExercise = (
  exercise_id: string
): Promise<ExerciseDeleteResponse> =>
  request<ExerciseDeleteResponse>(`${API_URL}/exercises`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ exercise_id }),
    successMessage: "Exercise deleted",
  });

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
  request<FoodResponse>(
    `${API_URL}/foods${food_id ? `?food_id=${food_id}` : ""}`,
    {
      headers: getHeaders(),
    }
  );

interface FoodCreateResponse {
  food_id: number;
  message: string;
}

export const addFood = (data: Food): Promise<FoodCreateResponse> =>
  request<FoodCreateResponse>(`${API_URL}/foods`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    successMessage: "Food added",
  });

interface FoodUpdateResponse {
  message: string;
}

export const updateFood = (
  data: Food & { food_id: number }
): Promise<FoodUpdateResponse> =>
  request<FoodUpdateResponse>(`${API_URL}/foods`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
    successMessage: "Food updated",
  });

interface FoodDeleteResponse {
  message: string;
}

export const deleteFood = (food_id: number): Promise<FoodDeleteResponse> =>
  request<FoodDeleteResponse>(`${API_URL}/foods`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ food_id }),
    successMessage: "Food deleted",
  });

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
  period_type: "monthly";
  period_start: string;
}

interface GenerateSummaryResponse {
  message: string;
  success: boolean;
}

export const generateSummary = (
  params: GenerateSummaryRequest
): Promise<GenerateSummaryResponse> => {
  return request<GenerateSummaryResponse>(`${API_URL}/summary`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
};

export const getSummary = (
  params: GenerateSummaryRequest
): Promise<Summary> => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();

  return request<Summary>(`${API_URL}/summary?${query}`, {
    headers: getHeaders(),
  });
};

// --- FOOD LOGS ---
export const getFoodLogs = (meal_id?: number) =>
  request(`${API_URL}/food-logs${meal_id ? `?meal_id=${meal_id}` : ""}`, {
    headers: getHeaders(),
  });

export const addFoodLog = (data: any) =>
  request(`${API_URL}/food-logs`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    successMessage: "Food log added",
  });

export const updateFoodLog = (data: any) =>
  request(`${API_URL}/food-logs`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
    successMessage: "Food log updated",
  });

export const deleteFoodLog = (meal_id: number) =>
  request(`${API_URL}/food-logs`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ meal_id }),
    successMessage: "Food log deleted",
  });

// --- WORKOUT SESSIONS ---
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
type WorkoutSessionRequest =
  | CreateSessionRequest
  | AddExercisesRequest
  | LogWorkoutRequest;

interface WorkoutSessionResponse {
  message?: string;
  session_id?: number;
  detail_id?: number;
}

export const getWorkoutSessions = (params: {
  user_id?: number;
  session_id?: number;
}): Promise<any> => {
  const query = new URLSearchParams(
    params as Record<string, string>
  ).toString();
  return request(`${API_URL}/workout-sessions${query ? `?${query}` : ""}`, {
    headers: getHeaders(),
  });
};

// Helper function to determine which case we're handling
const isCreateSession = (
  data: WorkoutSessionRequest
): data is CreateSessionRequest => {
  return "user_id" in data && "scheduled_date" in data;
};

const isAddExercises = (
  data: WorkoutSessionRequest
): data is AddExercisesRequest => {
  return "session_id" in data && "exercises" in data;
};

const isLogWorkout = (
  data: WorkoutSessionRequest
): data is LogWorkoutRequest => {
  return "session_detail_id" in data && "log" in data;
};

export const createWorkoutSession = (
  data: WorkoutSessionRequest
): Promise<WorkoutSessionResponse> => {
  // Type guard to ensure we're sending the correct data structure
  if (!isCreateSession(data) && !isAddExercises(data) && !isLogWorkout(data)) {
    return Promise.reject(new Error("Invalid request data structure"));
  }

  return request(`${API_URL}/workout-sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
};

// Helper function specifically for adding exercises to a session (Case 2)
export const addExercisesToSession = (
  session_id: number,
  data: { exercises: WorkoutSessionExercise[] }
): Promise<WorkoutSessionResponse> => {
  return createWorkoutSession({
    session_id,
    exercises: data.exercises,
  });
};

export const markSessionCompleted = (
  session_id: number
): Promise<WorkoutSessionResponse> =>
  request(`${API_URL}/workout-sessions`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ session_id }),
    successMessage: "Session marked complete",
  });

export const deleteWorkoutSession = (
  session_id: number
): Promise<WorkoutSessionResponse> =>
  request(`${API_URL}/workout-sessions`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ session_id }),
    successMessage: "Session deleted",
  });

/** ---------- Workout Plans ---------- **/

export interface PlanDayExercise {
  plan_day_exercise_id?: number;
  exercise_id: number;
  sets: number | null;
  reps: number | null;
  exercises?: Exercise;
}

export interface PlanDay {
  plan_day_id: number;
  day_number: number;
  day_type?: string | null;
  plan_day_exercises?: PlanDayExercise[];
}

export interface WorkoutPlan {
  plan_id: number;
  name: string;
  description: string;
  duration_days?: number;
  plan_days?: PlanDay[];
}

interface WorkoutPlansResponse {
  plans?: WorkoutPlan[];
  message?: string;
}

/** ---------- Fetch all workout plans ---------- **/
export const getWorkoutPlans = async (): Promise<WorkoutPlan[]> => {
  const response = await request<WorkoutPlan[] | WorkoutPlansResponse>(
    `${API_URL}/workout-plans`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
  // Handle both array response and object with plans property
  if (Array.isArray(response)) {
    return response;
  }
  return (response as WorkoutPlansResponse).plans || [];
};

/** ---------- Fetch a single plan by ID ---------- **/
export const getWorkoutPlanDetails = (
  plan_id: number
): Promise<WorkoutPlan> => {
  return request<WorkoutPlan>(`${API_URL}/workout-plans?plan_id=${plan_id}`, {
    method: "GET",
    headers: getHeaders(),
  });
};

interface ApplyWorkoutPlanResponse {
  message: string;
}

/** ---------- Apply a plan for a user ---------- **/
export const applyWorkoutPlan = (
  user_id: number,
  plan_id: number,
  start_date: string
): Promise<ApplyWorkoutPlanResponse> => {
  return request<ApplyWorkoutPlanResponse>(`${API_URL}/workout-plans`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ user_id, plan_id, start_date }),
    successMessage: "Plan applied successfully",
  });
};
