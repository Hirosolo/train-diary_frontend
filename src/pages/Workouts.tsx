import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaDumbbell, FaTrophy, FaTimes } from "react-icons/fa";
import { HiPlusSm } from "react-icons/hi";
import Navbar from "../components/NavBar/NavBar";
import { useAuth } from "../context/AuthContext";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import {
  PageContainer,
  CardGrid,
  Card,
  ModalContent,
  GridForm,
  StatCard,
} from "../components/shared/SharedComponents";
import styles from "./Workouts.module.css";
import {
  getWorkoutSessions,
  createWorkoutSession,
  addExercisesToSession,
  markSessionCompleted,
  deleteWorkoutSession,
  getExercises,
  API_URL,
} from "../api";

import { Exercise } from "../api";

const SESSIONS_CACHE_KEY = "workoutSessionsCache";
const SESSIONS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const getDayStamp = () => new Date().toISOString().slice(0, 10);

interface SessionsCachePayload {
  sessions: Session[];
  fetchedAt: number;
  dayStamp: string;
  userId: number | null;
}

const readSessionsCache = (): SessionsCachePayload | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSIONS_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.sessions)) {
      return parsed as SessionsCachePayload;
    }
  } catch {
    return null;
  }
  return null;
};

const persistSessionsCache = (
  sessions: Session[],
  userId: number | null
): SessionsCachePayload => {
  const payload: SessionsCachePayload = {
    sessions,
    fetchedAt: Date.now(),
    dayStamp: getDayStamp(),
    userId,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(payload));
  }
  return payload;
};

const shouldRefreshSessions = (
  cache: SessionsCachePayload | null,
  userId: number | null
) => {
  if (!cache) return true;
  if (cache.userId !== userId) return true;
  if (cache.dayStamp !== getDayStamp()) return true;
  return Date.now() - cache.fetchedAt >= SESSIONS_CACHE_TTL;
};

interface Session {
  session_id: number;
  scheduled_date: string;
  completed: boolean;
  notes: string;
  type?: string;
}
interface SessionDetail {
  session_detail_id: number;
  exercise_id: number;
  planned_sets: number;
  planned_reps: number;
  exercises?: {
    name: string;
    category: string;
    description: string;
  };
}
interface SessionLog {
  log_id: number;
  session_detail_id: number;
  actual_sets: number;
  actual_reps: number;
  weight_kg: number;
  duration_seconds: number;
  notes: string;
  exercise_id: number;
  name: string;
}
const sessionTypes = [
  "Push",
  "Pull",
  "Legs",
  "Arms + Back",
  "Full Body",
  "Cardio",
  "Upper",
  "Lower",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core / Abs",
  "Push + Pull",
  "Chest + Triceps",
  "Back + Biceps",
  "Legs + Shoulders",
  "Functional Training",
  "Full Body + Cardio",
  "Custom",
];

const Workouts: React.FC = () => {
  const { user, loading: authLoading, refreshAuthCache } = useAuth();
  const { triggerRefresh } = useDashboardRefresh();

  if (authLoading)
    return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const initialSessionsCache = readSessionsCache();
  const [sessionsCache, setSessionsCache] =
    useState<SessionsCachePayload | null>(initialSessionsCache);
  const [sessions, setSessions] = useState<Session[]>(
    () => initialSessionsCache?.sessions || []
  );
  const [loading, setLoading] = useState(() => !initialSessionsCache);
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7)
  );
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [error, setError] = useState("");
  const [detailsModal, setDetailsModal] = useState<{
    session: Session;
    open: boolean;
  } | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [addExerciseForm, setAddExerciseForm] = useState({
    exercise_id: "",
    planned_sets: "",
    planned_reps: "",
  });
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<
    number | null
  >(null);
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<
    number | null
  >(null);
  const [formType, setFormType] = useState(sessionTypes[0]);
  const [workoutStats, setWorkoutStats] = useState({
    totalWorkouts: 0,
    completedToday: false,
    weeklyStreak: 0,
    avgDuration: 0,
  });
  const [addExerciseLoading, setAddExerciseLoading] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    actual_sets: "",
    actual_reps: "",
    weight_kg: "",
    notes: "",
  });
  const [logExerciseId, setLogExerciseId] = useState<number | null>(null);
  const [completingSession, setCompletingSession] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  useEffect(() => {
    if (user && !authLoading) fetchSessions(true);
  }, [user, authLoading, selectedMonth]);

  useEffect(() => {
    if (sessions.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const stats = {
        totalWorkouts: sessions.filter((s) => s.completed).length,
        completedToday: sessions.some(
          (s) => s.scheduled_date.slice(0, 10) === today && s.completed
        ),
        weeklyStreak: calculateWeeklyStreak(sessions),
        avgDuration: calculateAverageDuration(sessions),
      };
      setWorkoutStats(stats);
    }
  }, [sessions]);

  const fetchSessions = async (force = false) => {
    if (!user?.user_id) return;

    const needsRefresh =
      force || shouldRefreshSessions(sessionsCache, user.user_id);

    if (!needsRefresh && sessionsCache) {
      setSessions(sessionsCache.sessions);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("Refreshing workout sessions...");
    try {
      const data = await getWorkoutSessions({
        user_id: user.user_id,
        month: selectedMonth,
      });
      const nextSessions = Array.isArray(data) ? data : data.sessions || [];
      setSessions(nextSessions);
      const payload = persistSessionsCache(nextSessions, user.user_id);
      setSessionsCache(payload);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setError("Failed to load workouts");
    }
    setLoading(false);
  };

  const handleRefreshSessions = async () => {
    await fetchSessions(true);
    refreshAuthCache("manual-refresh");
  };

  const openDetails = async (session: Session) => {
    setDetailsModal({ session, open: true });
    try {
      const data = await getWorkoutSessions({ session_id: session.session_id });
      setSessionDetails(data.details || []);
      setSessionLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading session details:", error);
      setError("Failed to load workout details");
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await createWorkoutSession({
        user_id: user!.user_id,
        scheduled_date: formDate,
        notes: formNotes,
        type: formType,
      });

      if (data.session_id) {
        setShowForm(false);
        setFormDate("");
        setFormNotes("");
        setFormType(sessionTypes[0]);
        await fetchSessions(true);
        triggerRefresh();
        refreshAuthCache("session-created");
      }
    } catch (error) {
      console.error("Error scheduling session:", error);
      // Error notification is handled by the API request function
    }
  };

  const handleDeleteExercise = async (detailId: number) => {
    try {
      // Note: The API doesn't have a delete exercise from session endpoint in index.ts
      // You'll need to add this to your API or use a direct fetch call
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/workout-sessions/details/${detailId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete exercise");

      setDeleteExerciseConfirm(null);
      if (detailsModal?.session) {
        openDetails(detailsModal.session);
      }
      refreshAuthCache("session-modified");
    } catch (error) {
      console.error("Error deleting exercise:", error);
      setError("Failed to delete exercise. Please try again.");
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteWorkoutSession(sessionId);
      setDeleteSessionConfirm(null);
      await fetchSessions(true);
      triggerRefresh();
      refreshAuthCache("session-deleted");
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d
      .toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      .replace(/\b0(\d)\b/g, "$1");
  };

  const calculateWeeklyStreak = (sessions: Session[]): number => {
    // Collect all completed workout dates as YYYY-MM-DD strings
    const completedDateStrings = sessions
      .filter((s) => s.completed)
      .map((s) => s.scheduled_date.slice(0, 10));

    if (completedDateStrings.length === 0) return 0;

    // Find the most recent completed workout day
    const latestDateStr = completedDateStrings.reduce((max, cur) =>
      cur > max ? cur : max
    );

    const completedDates = new Set(completedDateStrings);

    // Start counting from that most recent workout day backwards
    let streak = 0;
    const cursor = new Date(latestDateStr);

    while (true) {
      const dayKey = cursor.toISOString().slice(0, 10);
      if (!completedDates.has(dayKey)) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  };

  const calculateAverageDuration = (sessions: Session[]): number => {
    const completedSessions = sessions.filter((s) => s.completed);
    if (completedSessions.length === 0) return 0;

    const totalDuration = sessionLogs.reduce((total, log) => {
      return total + (log.duration_seconds || 0);
    }, 0);

    return Math.round(totalDuration / (60 * completedSessions.length));
  };

  const fetchAllExercises = async () => {
    try {
      const data = await getExercises();
      setAllExercises(Array.isArray(data) ? data : []);
      console.log("Fetched exercises:", data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      setError("Failed to load exercises");
    }
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );
  
  const openLogModal = (exerciseId: number) => {
    setLogExerciseId(exerciseId);
    setLogForm({ actual_sets: "", actual_reps: "", weight_kg: "", notes: "" });
    setShowLogModal(true);
  };

  const handleSubmitLog = async () => {
    if (!logExerciseId || !logForm.actual_sets || !logForm.actual_reps) return;
    try {
      const detail = sessionDetails.find(
        (d) => d.exercise_id === logExerciseId
      );
      if (!detail) return;

      await createWorkoutSession({
        session_detail_id: detail.session_detail_id,
        log: {
          actual_sets: parseInt(logForm.actual_sets),
          actual_reps: parseInt(logForm.actual_reps),
          weight_kg: parseFloat(logForm.weight_kg) || 0,
          duration_seconds: 0,
          notes: logForm.notes || "",
        },
      });

      setShowLogModal(false);
      setLogExerciseId(null);
      setLogForm({
        actual_sets: "",
        actual_reps: "",
        weight_kg: "",
        notes: "",
      });
      if (detailsModal?.session) openDetails(detailsModal.session);
      refreshAuthCache("session-modified");
    } catch (e) {
      console.error("Failed to log set:", e);
    }
  };

  const handleCompleteSession = async () => {
    if (!detailsModal?.session) return;
    setCompletingSession(true);
    try {
      await markSessionCompleted(detailsModal.session.session_id);
      setDetailsModal(null);
      await fetchSessions(true);
      triggerRefresh();
      refreshAuthCache("session-modified");
    } catch (e) {
      console.error("Failed to complete session:", e);
    }
    setCompletingSession(false);
  };

  const allExercisesLogged =
    sessionDetails.length > 0 &&
    sessionDetails.every((detail) =>
      sessionLogs.some(
        (log) => log.session_detail_id === detail.session_detail_id
      )
    );

  const handleAddExercise = async () => {
    if (
      !detailsModal ||
      !detailsModal.session ||
      !addExerciseForm.exercise_id ||
      !addExerciseForm.planned_sets ||
      !addExerciseForm.planned_reps
    )
      return;
    setAddExerciseLoading(true);
    try {
      await addExercisesToSession(detailsModal.session.session_id, {
        exercises: [
          {
            exercise_id: parseInt(addExerciseForm.exercise_id),
            planned_sets: parseInt(addExerciseForm.planned_sets),
            planned_reps: parseInt(addExerciseForm.planned_reps),
          },
        ],
      });
      setShowAddExerciseModal(false);
      setAddExerciseForm({
        exercise_id: "",
        planned_sets: "",
        planned_reps: "",
      });
      openDetails(detailsModal.session);
      refreshAuthCache("session-modified");
    } catch (e) {
      console.error("Failed to add exercise:", e);
    }
    setAddExerciseLoading(false);
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/workout-sessions/log/${logId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete log");

      if (detailsModal?.session) openDetails(detailsModal.session);
      refreshAuthCache("session-modified");
    } catch (e) {
      console.error("Failed to delete log:", e);
    }
  };

  return (
    <PageContainer>
      <Navbar />
      <div style={{ marginTop: "4rem"}}>
        <label
          style={{ fontWeight: "bold", marginRight: "0.5rem", display: "block" }}
        >
          Workouts in
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: "0.3rem",
            borderRadius: "6px",
            marginTop: "0.5rem",
          }}
        />
      </div>
      <CardGrid className={styles.statsGrid} style={{ marginTop: "3rem" }}>
        <StatCard
          value={workoutStats.totalWorkouts}
          label="Total Workouts"
          icon={<FaDumbbell />}
          className={styles.statCard}
        />
        <StatCard
          value={`${workoutStats.weeklyStreak}`}
          label="Current Streak"
          icon={<FaTrophy />}
          className={styles.statCard}
        />
      </CardGrid>

      <div
        style={{
          marginTop: "1.5rem",
          marginBottom: "0.7rem",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
        }}
      >
        <button
          className={styles.scheduleBtn}
          style={{
            alignSelf: "flex-end",
            marginBottom: "2.5rem",
            marginTop: "0.5rem",
          }}
          onClick={() => setShowForm(true)}
        >
          Schedule a workout
        </button>
        <button
          className={styles.refreshBtn}
          style={{ marginTop: "0.5rem", marginLeft: "1rem" }}
          onClick={handleRefreshSessions}
          disabled={loading}
        >
          Refresh Sessions
        </button>
      </div>

      <div className={styles.cardGrid}>
        {loading ? (
          <Card className={styles.loadingCard}>
            <div className={styles.loader}>Loading...</div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p>
              No workouts scheduled. Start by scheduling your first workout!
            </p>
            <button
              className={styles.scheduleBtn}
              onClick={() => setShowForm(true)}
            >
              <HiPlusSm /> Schedule First Workout
            </button>
          </Card>
        ) : (
          [...sessions]
            .sort(
              (a, b) =>
                new Date(a.scheduled_date).getTime() -
                new Date(b.scheduled_date).getTime()
            )
            .map((session) => (
              <div key={session.session_id}>
                <Card className={styles.sessionCard}>
                  <div className={styles.sessionHeader}>
                    <div>
                      <h3
                        className={`${styles.sessionDate} ${
                          session.completed ? styles.completed : ""
                        }`}
                      >
                        {formatDate(session.scheduled_date)}
                      </h3>

                      <div className={styles.sessionStatus}>
                        Status:{" "}
                        {session.completed ? (
                          <span style={{ color: "#4caf50" }}>Complete</span>
                        ) : (
                          <span style={{ color: "#ff3e3e" }}>Incomplete</span>
                        )}
                      </div>

                      <p className={styles.sessionType}>{session.type}</p>

                      {session.notes && (
                        <p className={styles.sessionNotes}>{session.notes}</p>
                      )}
                    </div>

                    <div className={styles.sessionActions}>
                      <button
                        className={styles.detailsBtn}
                        onClick={() => openDetails(session)}
                      >
                        Details
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() =>
                          setDeleteSessionConfirm(session.session_id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            ))
        )}
      </div>

      {showForm && (
        <ModalContent
          title="Schedule Workout"
          onClose={() => setShowForm(false)}
        >
          <GridForm onSubmit={handleSchedule}>
            <div className={styles.formGroup}>
              <label>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                required
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalActions}>
              <button
                type="submit"
                className={styles.scheduleBtn}
                style={{ paddingLeft: "1.5rem" }}
              >
                Schedule
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </GridForm>
        </ModalContent>
      )}

      {detailsModal?.open && (
        <ModalContent
          title={`Workout Details - ${formatDate(
            detailsModal.session.scheduled_date
          )}`}
          onClose={() => setDetailsModal(null)}
        >
          <div
            className={styles.exercisesList}
            style={{ maxWidth: "900px", margin: "0 auto" }}
          >
            {sessionDetails.map((detail) => (
              <div
                key={detail.session_detail_id}
                className={styles.exerciseItem}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "2.5rem",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.exerciseInfoRow}>
                    <span className={styles.draggableIcon}></span>
                    <div className={styles.exerciseInfo}>
                      <div className={styles.exerciseName}>
                        {detail.exercises?.name ||
                          detail.exercises?.name ||
                          "Unnamed Exercise"}
                      </div>
                      <div className={styles.exerciseStats}>
                        <span>{detail.planned_sets} sets</span>
                        <span>{detail.planned_reps} reps</span>
                        {detail.exercises?.category && (
                          <span style={{ opacity: 0.7 }}>
                            ({detail.exercises.category})
                          </span>
                        )}
                      </div>
                      {(detail.exercises?.description ||
                        detail.exercises?.description) && (
                        <div className={styles.exerciseDescription}>
                          {detail.exercises?.description ||
                            detail.exercises?.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.exerciseActions}>
                    {!detailsModal.session.completed && (
                      <>
                        <button
                          className={styles.logSetBtn}
                          onClick={() => openLogModal(detail.exercise_id)}
                        >
                          Log Set
                        </button>
                        <button
                          className={styles.removeBtn}
                          onClick={() =>
                            setDeleteExerciseConfirm(detail.session_detail_id)
                          }
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {sessionLogs.filter(
                  (log) => log.session_detail_id === detail.session_detail_id
                ).length > 0 && (
                  <div
                    className={styles.realityPerformanceBlock}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderLeft: "1px solid rgba(255,255,255,0.10)",
                      paddingLeft: "2rem",
                    }}
                  >
                    <div className={styles.realityPerformanceLabel}>
                      Reality performance:
                    </div>
                    {sessionLogs
                      .filter(
                        (log) =>
                          log.session_detail_id === detail.session_detail_id
                      )
                      .map((log) => (
                        <div
                          key={log.log_id}
                          className={styles.exerciseLogItem}
                        >
                          <span className={styles.logLeft}>
                            <strong>{log.actual_sets} sets</strong> ×{" "}
                            <strong>{log.actual_reps} reps</strong>
                          </span>
                          <span className={styles.logRight}>
                            <span className={styles.logDraggableIcon}></span>
                            <span>
                              <strong>{log.weight_kg}kg</strong>
                            </span>
                            {log.notes && (
                              <span className="logNotes">({log.notes})</span>
                            )}
                            <button
                              className={styles.deleteLogBtn}
                              onClick={() => handleDeleteLog(log.log_id)}
                            >
                              <FaTimes />
                            </button>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {!detailsModal.session.completed && allExercisesLogged && (
              <button
                className={styles.completeSessionBtn}
                style={{ marginTop: 24, width: "100%" }}
                onClick={handleCompleteSession}
                disabled={completingSession}
              >
                {completingSession ? "Completing..." : "Complete Session"}
              </button>
            )}

            {!detailsModal.session.completed && !allExercisesLogged && (
              <div style={{ color: "#aaa", marginTop: 16, fontSize: "0.98em" }}>
                Log at least one set for every exercise to complete this
                session.
              </div>
            )}

            {!detailsModal.session.completed && (
              <button
                className={styles.addExerciseBtn}
                style={{ marginTop: 16, width: "100%" }}
                onClick={() => {
                  setShowAddExerciseModal(true);
                  fetchAllExercises();
                }}
              >
                Add Exercise
              </button>
            )}
          </div>
        </ModalContent>
      )}

      {showAddExerciseModal && (
        <ModalContent
          title="Add Exercise to Session"
          onClose={() => setShowAddExerciseModal(false)}
        >
          <input
            type="text"
            placeholder="Search exercises..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "1rem",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#222",
              color: "#fff",
            }}
          />
          <div className={styles.exerciseGrid}>
            {filteredExercises.map((exercise) => (
              <div
                key={exercise.exercise_id}
                className={`${styles.exerciseOption} ${
                  addExerciseForm.exercise_id ===
                  exercise.exercise_id.toString()
                    ? styles.selected
                    : ""
                }`}
                onClick={() =>
                  setAddExerciseForm((f) => ({
                    ...f,
                    exercise_id: exercise.exercise_id.toString(),
                    planned_sets: exercise.default_sets?.toString() || "",
                    planned_reps: exercise.default_reps?.toString() || "",
                  }))
                }
              >
                <div className={styles.exerciseName}>{exercise.name}</div>
                {exercise.description && (
                  <div className={styles.exerciseDescription}>
                    {exercise.description}
                  </div>
                )}
                {addExerciseForm.exercise_id ===
                  exercise.exercise_id.toString() && (
                  <div
                    style={{ color: "#aaa", fontSize: "0.95em", marginTop: 4 }}
                  >
                    Default: {exercise.default_sets || "-"} sets,{" "}
                    {exercise.default_reps || "-"} reps
                  </div>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              marginTop: "1rem",
            }}
          >
            <input
              type="number"
              min="1"
              placeholder="Sets"
              value={addExerciseForm.planned_sets}
              onChange={(e) =>
                setAddExerciseForm((f) => ({
                  ...f,
                  planned_sets: e.target.value,
                }))
              }
              style={{
                width: 80,
                padding: 8,
                marginTop: "1rem",
                borderRadius: 6,
                border: "1px solid #444",
                background: "#222",
                color: "#fff",
              }}
            />
            <input
              type="number"
              min="1"
              placeholder="Reps"
              value={addExerciseForm.planned_reps}
              onChange={(e) =>
                setAddExerciseForm((f) => ({
                  ...f,
                  planned_reps: e.target.value,
                }))
              }
              style={{
                width: 80,
                padding: 8,
                marginTop: "1rem",
                borderRadius: 6,
                border: "1px solid #444",
                background: "#222",
                color: "#fff",
              }}
            />
            <button
              className={styles.addExerciseBtn}
              style={{ marginTop: 0 }}
              onClick={handleAddExercise}
              disabled={
                addExerciseLoading ||
                !addExerciseForm.exercise_id ||
                !addExerciseForm.planned_sets ||
                !addExerciseForm.planned_reps
              }
            >
              {addExerciseLoading ? "Adding..." : "Add"}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowAddExerciseModal(false)}
            >
              Cancel
            </button>
          </div>
        </ModalContent>
      )}

      {deleteSessionConfirm && (
        <ModalContent
          title="Delete Workout"
          onClose={() => setDeleteSessionConfirm(null)}
        >
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this workout?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDeleteSession(deleteSessionConfirm)}
              >
                Delete
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteSessionConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}

      {deleteExerciseConfirm && (
        <ModalContent
          title="Delete Exercise"
          onClose={() => setDeleteExerciseConfirm(null)}
        >
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to remove this exercise?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDeleteExercise(deleteExerciseConfirm)}
              >
                Delete
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteExerciseConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}

      {showLogModal && (
        <ModalContent title="Log Set">
          <div className={styles.formGroup}>
            <label>Sets</label>
            <input
              type="number"
              min="1"
              value={logForm.actual_sets}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, actual_sets: e.target.value }))
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Reps</label>
            <input
              type="number"
              min="1"
              value={logForm.actual_reps}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, actual_reps: e.target.value }))
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Weight (kg)</label>
            <input
              type="number"
              min="0"
              value={logForm.weight_kg}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, weight_kg: e.target.value }))
              }
            />
          </div>
          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              value={logForm.notes}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className={styles.modalActions}>
            <button
              className={styles.addExerciseBtn}
              style={{ marginTop: 0 }}
              onClick={handleSubmitLog}
              disabled={!logForm.actual_sets || !logForm.actual_reps}
            >
              Log
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowLogModal(false)}
            >
              Cancel
            </button>
          </div>
        </ModalContent>
      )}
    </PageContainer>
  );
};

export default Workouts;
