import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FaDumbbell,
  FaFire,
  FaAppleAlt,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaQuestionCircle,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import {
  generateSummary,
  getSummary,
  getDailyFoodIntake,
  DailyFoodIntake,
  getProgress,
  ProgressEntry,
} from "../api";
import Navbar from "../components/NavBar/NavBar";
import {
  PageContainer,
  PageHeader,
  CardGrid,
  Card,
  StatCard,
} from "../components/shared/SharedComponents";
import styles from "./Dashboard.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderWidth?: number;
    pointRadius?: number;
    tension?: number;
    yAxisID?: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading, refreshAuthCache } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyIntake, setDailyIntake] = useState<DailyFoodIntake[]>([]);
  const [monthlyNutrition, setMonthlyNutrition] = useState<{
    totalCalories: number;
    totalProtein: number;
  }>({
    totalCalories: 0,
    totalProtein: 0,
  });
  const [periodType, setPeriodType] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const { subscribe } = useDashboardRefresh();
  const [showGRTooltip, setShowGRTooltip] = useState(false);

  const SUMMARY_CACHE_KEY = 'summaryCache_v1';
  const SUMMARY_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  const getDayStamp = () => new Date().toISOString().slice(0, 10);

  interface SummaryCachePayload {
    summary: Summary;
    fetchedAt: number;
    dayStamp: string;
    userId: number;
    periodStart: string;
  }

  const readSummaryCache = (): SummaryCachePayload | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.summary && typeof parsed.fetchedAt === 'number') {
        return parsed as SummaryCachePayload;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const persistSummaryCache = (
    summaryData: Summary,
    userId: number,
    periodStart: string
  ): SummaryCachePayload => {
    const payload: SummaryCachePayload = {
      summary: summaryData,
      fetchedAt: Date.now(),
      dayStamp: getDayStamp(),
      userId,
      periodStart,
    };
    try {
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore quota errors
    }
    return payload;
  };

  const shouldRefreshSummary = (
    cache: SummaryCachePayload | null,
    userId: number,
    periodStart: string
  ) => {
    if (!cache) return true;
    if (cache.userId !== userId) return true;
    if (cache.periodStart !== periodStart) return true;
    if (cache.dayStamp !== getDayStamp()) return true; // new day
    return Date.now() - cache.fetchedAt >= SUMMARY_CACHE_TTL;
  };

  if (authLoading)
    return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Function to fetch all required data
  const fetchData = useCallback(
    async (force = false) => {
      if (!user) return;
      try {
        setLoading(true);
        const periodStart = `${periodType}-01`; // First day of selected month
        const [yearStr, monthStr] = periodType.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);

        const cached = readSummaryCache();
        const dirtyFlag = typeof window !== 'undefined' && !!localStorage.getItem('dashboard_needs_refresh');
        if (dirtyFlag) {
          try {
            localStorage.removeItem('dashboard_needs_refresh');
          } catch (e) {
            // ignore
          }
        }

        const needsRefresh = force || dirtyFlag || shouldRefreshSummary(cached, user.user_id, periodStart);

        if (!needsRefresh && cached) {
          setSummary(cached.summary);
          // Use cached summary period to derive nutrition as well
          const dates = getDatesInMonth(periodType);
          const intakePromises = dates.map((date) =>
            getDailyFoodIntake(user.user_id, date).catch((err) => {
              console.error("Failed to fetch daily intake for", date, err);
              return null;
            })
          );
          const intakeResults = (await Promise.all(intakePromises)).filter(
            (d): d is DailyFoodIntake => d !== null
          );
          setDailyIntake(intakeResults);
          const totalCalories = intakeResults.reduce(
            (sum, d) => sum + (d.calories || 0),
            0
          );
          const totalProtein = intakeResults.reduce(
            (sum, d) => sum + (d.protein || 0),
            0
          );
          setMonthlyNutrition({ totalCalories, totalProtein });

          // Fetch GR progress for selected month
          if (year && month) {
            const progress = await getProgress({
              user_id: user.user_id,
              year,
              month,
            }).catch((err) => {
              console.error("Failed to fetch progress:", err);
              return null;
            });
            if (progress) {
              setProgressData(normalizeMonthlyProgress(progress, periodType));
            } else {
              setProgressData(
                getDatesInMonth(periodType).map((date) => ({
                  date,
                  gr_score: 0,
                }))
              );
            }
          } else {
            setProgressData([]);
          }
          return;
        }

        console.log("Dashboard: Generating new summary for:", periodStart);
        const generatedSummary = await generateSummary({
          user_id: user.user_id,
          period_type: "monthly",
          period_start: periodStart,
        }).catch((error) => {
          console.error("Failed to generate summary:", error);
          return null;
        });

        // Fetch summary data
        const summaryData = await getSummary({
          user_id: user.user_id,
          period_type: "monthly",
          period_start: periodStart,
        }).catch((err) => {
          console.error("Failed to fetch summary:", err);
          return null;
        });

        if (summaryData) {
          setSummary(summaryData);
          persistSummaryCache(summaryData, user.user_id, periodStart);

          // Fetch daily intake for each day in the selected month
          const dates = getDatesInMonth(periodType);
          const intakePromises = dates.map((date) =>
            getDailyFoodIntake(user.user_id, date).catch((err) => {
              console.error("Failed to fetch daily intake for", date, err);
              return null;
            })
          );
          const intakeResults = (await Promise.all(intakePromises)).filter(
            (d): d is DailyFoodIntake => d !== null
          );
          setDailyIntake(intakeResults);

          const totalCalories = intakeResults.reduce(
            (sum, d) => sum + (d.calories || 0),
            0
          );
          const totalProtein = intakeResults.reduce(
            (sum, d) => sum + (d.protein || 0),
            0
          );
          setMonthlyNutrition({ totalCalories, totalProtein });

          // Fetch GR progress for selected month
          if (year && month) {
            const progress = await getProgress({
              user_id: user.user_id,
              year,
              month,
            }).catch((err) => {
              console.error("Failed to fetch progress:", err);
              return null;
            });
            if (progress) {
              setProgressData(normalizeMonthlyProgress(progress, periodType));
            } else {
              setProgressData(
                getDatesInMonth(periodType).map((date) => ({
                  date,
                  gr_score: 0,
                }))
              );
            }
          } else {
            setProgressData([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    },
    [user, periodType]
  );

  // Unified effect for data fetching and refresh subscription
  useEffect(() => {
    if (!user) return;
    console.log("Dashboard: Setting up data fetching and refresh subscription");

    // Initial data fetch
    fetchData();

    // Subscribe to refresh events (force regeneration when triggered)
    const unsubscribe = subscribe(() => fetchData(true));

    return () => {
      console.log("Dashboard: Cleaning up refresh subscription");
      unsubscribe();
    };
  }, [user, subscribe, fetchData]);

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      await fetchData(true);
      try {
        refreshAuthCache?.("dashboard-manual-refresh");
      } catch (e) {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  // Common graph options
  const graphOptions = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255,255,255,0.1)",
        },
        ticks: {
          color: "#999",
        },
      },
      x: {
        grid: {
          color: "rgba(255,255,255,0.1)",
        },
        ticks: {
          color: "#999",
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#fff",
          font: { size: 12 },
        },
      },
    },
  };

  // Handle empty data cases
  useEffect(() => {
    if (!loading && summary?.dailyData?.length === 0) {
      console.log(
        "No daily data found, but not triggering refresh to avoid loops"
      );
    }
  }, [loading, summary]);

  // Prepare nutrition graph data
  const nutritionGraphData = React.useMemo(() => {
    if (!dailyIntake.length) return null;

    return {
      labels: dailyIntake.map((d) =>
        new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          label: "Calories",
          data: dailyIntake.map((d) => d.calories),
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          yAxisID: "y",
          tension: 0.4,
        },
        {
          label: "Protein (g)",
          data: dailyIntake.map((d) => d.protein),
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          yAxisID: "y1",
          tension: 0.4,
        },
      ],
    };
  }, [dailyIntake]);

  // Prepare GR score graph data (from progress API)
  const grScoreGraphData = React.useMemo(() => {
    if (!progressData.length) return null;

    return {
      labels: progressData.map((d) =>
        new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          label: "GR Score",
          data: progressData.map((d) => d.gr_score),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.4,
        },
      ],
    };
  }, [progressData]);
  
  const formatNumber = (num: number): string => {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num.toString();
  };

  const getDatesInMonth = (yearMonth: string): string[] => {
    const [yearStr, monthStr] = yearMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-12
    if (!year || !month) return [];

    const daysInMonth = new Date(year, month, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      dates.push(`${yearMonth}-${dayStr}`);
    }

    return dates;
  };

  const normalizeMonthlyProgress = (
    entries: ProgressEntry[],
    yearMonth: string
  ): ProgressEntry[] => {
    const byDate = new Map(entries.map((e) => [e.date, e]));
    const dates = getDatesInMonth(yearMonth);
    return dates.map((date) => byDate.get(date) || { date, gr_score: 0 });
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number): string => {
    if (change > 0) return `+${change.toFixed(1)}%`;
    return change.toFixed(1) + "%";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <FaArrowUp />;
    return <FaArrowDown />;
  };

  return (
    <div className={styles["dashboard-bg"]}>
      <Navbar />
      <PageContainer className={styles.dashboardContent}>
        <div className={styles["period-selector"]}>
          <input
            type="month"
            className={styles["period-select"]}
            style={{marginTop:"1rem"}}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          />
          <button
            className={styles.refreshBtn}
            onClick={handleManualRefresh}
            disabled={loading}
            title="Refresh dashboard data"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles["loading-spinner"]}>Loading summary...</div>
        ) : summary ? (
          <>
            <div className={styles.summaryStats}>
              <StatCard
                label="Total Workouts"
                value={
                  progressData.length
                    ? progressData.filter((d) => (d.gr_score || 0) > 0).length
                    : 0
                }
                icon={<FaDumbbell color="#e66" />}
              />
              <StatCard
                label="Avg. Calories Intake"
                value={formatNumber(
                  Number((monthlyNutrition.totalCalories / dailyIntake.length).toFixed(2))
                )}
                icon={<FaFire color="#f08f30" />}
              />
              <StatCard
                label="Avg. Daily Protein"
                value={`${
                  monthlyNutrition.totalProtein && dailyIntake.length
                    ? (monthlyNutrition.totalProtein / dailyIntake.length).toFixed(1)
                    : "0.0"
                }g`}
                icon={<FaAppleAlt color="#90ee90" />}
              />
              <StatCard
                label="Avg. GR Score"
                value={
                  progressData.length
                    ? (
                        progressData.reduce(
                          (sum, d) => sum + (d.gr_score || 0),
                          0
                        ) / progressData.length
                      ).toFixed(1)
                    : "0.0"
                }
                icon={<FaTrophy color="#ffd700" />}
              />
            </div>

            <div className={styles.graphContainer}>
              <div className={styles.graphSection}>
                <h3>Nutrition & Protein</h3>
                {nutritionGraphData ? (
                  <Line data={nutritionGraphData} options={graphOptions} />
                ) : (
                  <div className={styles.emptyState}>
                    No nutrition data available for this period.
                  </div>
                )}
              </div>

              <div className={styles.graphSection}>
                <h3 className={styles.graphTitleWithTooltip}>
                  GR Score
                  <span
                    className={styles.tooltipIcon}
                    onMouseEnter={() => setShowGRTooltip(true)}
                    onMouseLeave={() => setShowGRTooltip(false)}
                  >
                    <FaQuestionCircle />
                    {showGRTooltip && (
                      <span className={styles.tooltip}>
                        GR Score (Grind Rating) recognize your effor in workout
                        based on the intensity, volume, and the difficulty of
                        that muscle.
                      </span>
                    )}
                  </span>
                </h3>
                {grScoreGraphData ? (
                  <Line data={grScoreGraphData} options={graphOptions} />
                ) : (
                  <div className={styles.emptyState}>
                    No GR score data available for this period.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            No summary data available for this period. Generate data by adding
            workouts and foods.
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default Dashboard;
