import React, { useEffect, useState } from "react";
import Navbar from "../components/NavBar/NavBar";
import { useAuth } from "../context/AuthContext";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import { FaUtensils, FaFire, FaDumbbell, FaLeaf } from "react-icons/fa";
import { HiPlusSm } from "react-icons/hi";
import {
  PageContainer,
  CardGrid,
  Card,
  ModalContent,
  GridForm,
  StatCard,
  LoadingDots,
} from "../components/shared/SharedComponents";
import styles from "./Foods.module.css";

import {
  API_URL,
  addFoodLog,
  deleteFoodLog,
  getDailyFoodIntake,
} from "../api";

interface Meal {
  meal_id: number;
  log_date: string;
  meal_type: string;
}

interface MealFood {
  food_id?: number;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  amount_grams: number;
}

interface Food {
  food_id: number;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  serving_type: string;
  image?: string;
}

interface MealWithFoods extends Meal {
  foods: MealFood[];
}

const Foods: React.FC = () => {
  const { user, refreshAuthCache } = useAuth();
  const { triggerRefresh } = useDashboardRefresh();

  const [meals, setMeals] = useState<MealWithFoods[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ log_date: "", meal_type: "breakfast" });
  const [mealFoods, setMealFoods] = useState<
    { food: Food; amount_grams: string; serving_type: string }[]
  >([]);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amountGrams, setAmountGrams] = useState("");
  const [error, setError] = useState("");
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [mealDetails, setMealDetails] = useState<MealFood[]>([]);
  const [deleteMealId, setDeleteMealId] = useState<number | null>(null);
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // load meals + daily intake for selected date
  useEffect(() => {
    if (!user || !selectedDate) return;

    fetchMealsByDate(selectedDate);

    (async () => {
      try {
        const res = await getDailyFoodIntake(user.user_id, selectedDate);
        setDailyTotals({
          calories: res.calories ?? 0,
          protein: res.protein ?? 0,
          carbs: res.carbs ?? 0,
          fat: res.fat ?? 0,
        });
      } catch (err) {
        console.error("Error fetching daily intake:", err);
        setDailyTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    })();
  }, [user, selectedDate]);
  
  const handleRefreshMeals = async () => {
    if (!selectedDate || !user) return;

    await fetchMealsByDate(selectedDate);
    try {
      const res = await getDailyFoodIntake(user.user_id, selectedDate);
      setDailyTotals({
        calories: res.calories ?? 0,
        protein: res.protein ?? 0,
        carbs: res.carbs ?? 0,
        fat: res.fat ?? 0,
      });
    } catch (err) {
      console.error("Error refreshing daily intake:", err);
    }

    refreshAuthCache("meals-manual-refresh");
  };

  const fetchFoods = async () => {
    try {
      const res = await fetch(`${API_URL}/foods`);
      if (!res.ok) {
        console.error("Failed to fetch foods:", await res.text());
        setFoods([]);
        return;
      }

      const data = await res.json();
      setFoods(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching foods:", err);
      setFoods([]);
    }
  };

  const handleAddFood = () => {
    setFoodSearch("");
    setSelectedFood(null);
    setAmountGrams("");
    fetchFoods();
    setShowFoodModal(true);
  };

  /**
   * If the serving type contains a gram-based size (e.g. "100g", "50 g"),
   * extract that numeric gram amount so we can treat the user's input
   * as "number of servings" instead of raw grams.
   */
  const getServingSizeInGrams = (
    servingType: string | undefined
  ): number | null => {
    if (!servingType) return null;
    // Match values like "100g", "100 g", "150.5g", etc.
    const match = servingType.match(/(\d+(?:\.\d+)?)[ ]*g/i);
    return match ? parseFloat(match[1]) : null;
  };

  // fetch all meals (with foods) for a specific day
  const fetchMealsByDate = async (date: string) => {
    if (!user?.user_id || !date) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/food-logs?user_id=${user.user_id}&date=${date}`);
      if (!res.ok) {
        console.error("Failed to fetch meals for date:", await res.text());
        setMeals([]);
        return;
      }

      const mealsData = await res.json();

      const mealsWithFoods = await Promise.all(
        mealsData.map(async (meal: any) => {
          let foods: MealFood[] =
            meal.user_meal_details?.map((detail: any) => ({
              food_id: detail.food?.food_id,
              name: detail.food?.name ?? "Unknown Food",
              calories_per_serving: detail.food?.calories_per_serving ?? 0,
              protein_per_serving: detail.food?.protein_per_serving ?? 0,
              carbs_per_serving: detail.food?.carbs_per_serving ?? 0,
              fat_per_serving: detail.food?.fat_per_serving ?? 0,
              amount_grams: detail.amount_grams,
            })) || [];

          // keep foods nutrition in sync with /foods endpoint
          foods = await Promise.all(
            foods.map(async (food: MealFood) => {
              if (!food.food_id) return food;

              try {
                const foodRes = await fetch(
                  `${API_URL}/foods?food_id=${food.food_id}`
                );
                if (!foodRes.ok) return food;

                const data = await foodRes.json();
                const real = Array.isArray(data) ? data[0] : data;

                return {
                  ...food,
                  calories_per_serving:
                    real?.calories_per_serving ?? food.calories_per_serving,
                  protein_per_serving:
                    real?.protein_per_serving ?? food.protein_per_serving,
                  carbs_per_serving:
                    real?.carbs_per_serving ?? food.carbs_per_serving,
                  fat_per_serving:
                    real?.fat_per_serving ?? food.fat_per_serving,
                };
              } catch {
                return food;
              }
            })
          );

          return {
            meal_id: meal.meal_id,
            log_date: meal.log_date,
            meal_type: meal.meal_type,
            foods,
          };
        })
      );

      setMeals(mealsWithFoods);
    } catch (error) {
      console.error("Error fetching meals by date:", error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setAmountGrams("");
  };

  const handleAddFoodToMeal = () => {
    if (selectedFood && amountGrams) {
      const numericAmount = parseFloat(amountGrams);
      const gramsPerServing = getServingSizeInGrams(selectedFood.serving_type);
      const amountInGrams = gramsPerServing
        ? numericAmount * gramsPerServing
        : numericAmount;

      setMealFoods([
        ...mealFoods,
        { food: selectedFood, amount_grams: amountInGrams.toString(), serving_type: selectedFood.serving_type },
      ]);
      setShowFoodModal(false);
      setSelectedFood(null);
      setAmountGrams("");
    }
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mealFoods.length === 0) {
      setError("Add at least one food.");
      return;
    }

    const foodsPayload = mealFoods.map((f) => ({
      food_id: f.food.food_id,
      amount_grams: parseFloat(f.amount_grams),
    }));

    try {
      await addFoodLog({
        user_id: user?.user_id,
        meal_type: form.meal_type,
        log_date: form.log_date,
        foods: foodsPayload,
      });

      const dateToRefresh = form.log_date || selectedDate;
      if (dateToRefresh && user?.user_id) {
        setSelectedDate(dateToRefresh);
        await fetchMealsByDate(dateToRefresh);
        try {
          const res = await getDailyFoodIntake(user.user_id, dateToRefresh);
          setDailyTotals({
            calories: res.calories ?? 0,
            protein: res.protein ?? 0,
            carbs: res.carbs ?? 0,
            fat: res.fat ?? 0,
          });
        } catch (err) {
          console.error("Error updating daily intake after logging meal:", err);
        }
      }
      triggerRefresh();
      refreshAuthCache("meal-logged");
      setForm({ log_date: "", meal_type: "breakfast" });
      setMealFoods([]);
      setShowForm(false);
    } catch (err) {
      console.error("Error logging meal:", err);
      setError("Failed to log meal. Please try again.");
    }
  };

  const handleExpandMeal = async (meal_id: number) => {
    if (expandedMeal === meal_id) {
      setExpandedMeal(null);
      setMealDetails([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/meal-details?meal_id=${meal_id}`);

      const data = await res.json();

      const mappedDetails = data.map((item: any) => ({
        food_id: item.food.food_id,
        name: item.food.name,
        calories_per_serving: item.food.calories_per_serving,
        protein_per_serving: item.food.protein_per_serving,
        carbs_per_serving: item.food.carbs_per_serving,
        fat_per_serving: item.food.fat_per_serving,
        amount_grams: item.amount_grams,
      }));

      setExpandedMeal(meal_id);
      setMealDetails(mappedDetails);
    } catch (err) {
      console.error("Error loading meal details:", err);
    }
  };

  const confirmDeleteMeal = async () => {
    if (deleteMealId) {
      try {
        await deleteFoodLog(deleteMealId);

        setDeleteMealId(null);
        if (selectedDate && user?.user_id) {
          await fetchMealsByDate(selectedDate);
          try {
            const res = await getDailyFoodIntake(user.user_id, selectedDate);
            setDailyTotals({
              calories: res.calories ?? 0,
              protein: res.protein ?? 0,
              carbs: res.carbs ?? 0,
              fat: res.fat ?? 0,
            });
          } catch (err) {
            console.error("Error updating daily intake after deleting meal:", err);
          }
        }
        triggerRefresh();
        refreshAuthCache("meal-deleted");
      } catch (err) {
        console.error("Error deleting meal:", err);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <PageContainer>
      <Navbar />
      <div style={{ marginTop: "4rem", marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "0.5rem"}}>
          Nutrition on
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
          }}
          style={{ padding: "0.3rem", borderRadius: "6px", marginTop:"0.5rem"}}
        />
      </div>

      <CardGrid className={styles.statsGrid}>
        <StatCard
          value={dailyTotals.calories.toFixed(0)}
          label="Total Calories"
          icon={<FaFire />}
        />
        <StatCard
          value={`${dailyTotals.protein.toFixed(1)}g`}
          label="Protein"
          icon={<FaDumbbell />}
        />
        <StatCard
          value={`${dailyTotals.carbs.toFixed(1)}g`}
          label="Carbs"
          icon={<FaUtensils />}
        />
        <StatCard
          value={`${dailyTotals.fat.toFixed(1)}g`}
          label="Fat"
          icon={<FaLeaf />}
        />
      </CardGrid>

      <div
        style={{
          marginTop: "2.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className={styles.logMealBtn}
            style={{ alignSelf: "flex-end " }}
            onClick={() => setShowForm(true)}
          >
            Log New Meal
          </button>
          <button
            className={
              styles.refreshBtn ? styles.refreshBtn : styles.logMealBtn
            }
            style={{ alignSelf: "flex-end ", backgroundColor: "#4a5568" }}
            onClick={handleRefreshMeals}
            disabled={loading}
          >
            Refresh Meals
          </button>
        </div>
      </div>

      <CardGrid style={{display:"flex"}}>
        {loading ? (
          <Card className={styles.loadingCard}>
            <LoadingDots />
          </Card>
        ) : meals.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p>No meals logged yet. Start by adding your first meal!</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <HiPlusSm /> Log First Meal
            </button>
          </Card>
        ) : (
          meals.map((meal) => (
            <Card key={meal.meal_id} className={styles.mealCard}>
              <div className={styles.mealHeader}>
                <div>
                  <h3 className={styles.mealType}>
                    {meal.meal_type.charAt(0).toUpperCase() +
                      meal.meal_type.slice(1)}
                  </h3>
                  <p className={styles.mealDate}>{formatDate(meal.log_date)}</p>
                </div>
                <div className={styles.mealActions}>
                  <button
                    className={styles.detailsBtn}
                    onClick={() => handleExpandMeal(meal.meal_id)}
                  >
                    {expandedMeal === meal.meal_id
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteMealId(meal.meal_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedMeal === meal.meal_id && (
                <div className={styles.mealDetails}>
                  {mealDetails.map((food, idx) => (
                    <div key={idx} className={styles.foodItem}>
                      <div className={styles.foodInfo}>
                        <span className={styles.foodName}>{food.name}</span>
                        <span className={styles.foodAmount}>
                          {food.amount_grams}g
                        </span>
                      </div>
                      <div className={styles.foodNutrition}>
                        <span>
                          {(
                            (food.calories_per_serving * food.amount_grams) /
                            100
                          ).toFixed(0)}{" "}
                          cal
                        </span>
                        <span>
                          {(
                            (food.protein_per_serving * food.amount_grams) /
                            100
                          ).toFixed(1)}
                          g protein
                        </span>
                        <span>
                          {(
                            (food.carbs_per_serving * food.amount_grams) /
                            100
                          ).toFixed(1)}
                          g carbs
                        </span>
                        <span>
                          {(
                            (food.fat_per_serving * food.amount_grams) /
                            100
                          ).toFixed(1)}
                          g fat
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </CardGrid>

      {/* --- Add Meal Modal --- */}
      {showForm && (
        <ModalContent title="Log New Meal" onClose={() => setShowForm(false)}>
          <GridForm onSubmit={handleLogMeal}>
            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label>Date</label>
              <input
                type="date"
                value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label>Meal Type</label>
              <select
                value={form.meal_type}
                onChange={(e) =>
                  setForm({ ...form, meal_type: e.target.value })
                }
                required
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div className={styles.foodsList}>
              {mealFoods.map((mealFood, idx) => (
                <div key={idx} className={styles.foodItem}>
                  <span>{mealFood.food.name}</span>
                  <span>{mealFood.amount_grams} {mealFood.serving_type}</span>
                  <button
                    type="button"
                    className="btn-icon-danger"
                    onClick={() =>
                      setMealFoods((foods) => foods.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addFoodBtn}
                onClick={handleAddFood}
              >
                <HiPlusSm /> Add Food
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalActions}>
              <button type="submit" className="btn-primary">
                Save Meal
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </GridForm>
        </ModalContent>
      )}

      {/* --- Add Food Modal --- */}
      {showFoodModal && (
        <ModalContent title="Add Food to Meal">
          <div className={styles.foodSearchGrid}>
            <input
              type="text"
              placeholder="Search foods..."
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.foodsGrid}>
            {foods
              .filter((food) =>
                food.name.toLowerCase().includes(foodSearch.toLowerCase())
              )
              .map((food) => (
                <div
                  key={food.food_id}
                  className={`${styles.foodOption} ${
                    selectedFood?.food_id === food.food_id
                      ? styles.selected
                      : ""
                  }`}
                  onClick={() => handleSelectFood(food)}
                >
                  <div className={styles.foodOptionInfo}>
                    <span className={styles.foodName}>{food.name}</span>
                    <span className={styles.foodNutrition}>
                      {food.calories_per_serving} cal |{" "}
                      {food.protein_per_serving}g protein
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {selectedFood && (
            <div
              className={styles.formGroup}
              style={{ maxWidth: "none", margin: "1rem 0" }}
            >
              <label>Amount ({selectedFood.serving_type})</label>
              <input
                type="number"
                value={amountGrams}
                onChange={(e) => setAmountGrams(e.target.value)}
                min="0"
                required
              />
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              marginTop: "1rem",
            }}
          >
            <button
              className={styles.addFoodToMealBtn}
              onClick={handleAddFoodToMeal}
              disabled={!selectedFood || !amountGrams}
              style={{ flexGrow: 1 }}
            >
              Add To Meal
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowFoodModal(false)}
              style={{ flexGrow: 1 }}
            >
              Close
            </button>
          </div>
        </ModalContent>
      )}

      {/* --- Delete Confirmation --- */}
      {deleteMealId && (
        <ModalContent title="Delete Meal" onClose={() => setDeleteMealId(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this meal?</p>
            <div className={styles.modalActions}>
              <button className="btn-danger" onClick={confirmDeleteMeal}>
                Delete
              </button>
              <button
                className="btn-secondary"
                onClick={() => setDeleteMealId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}
    </PageContainer>
  );
};

export default Foods;
