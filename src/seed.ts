import type { AppState, CheckIn, Client, Exercise, Meal, MealType, PlanItem } from "./types";
import { addDays, todayISO } from "./lib";

let tick = 0;
const ts = (daysAgo: number) => Date.now() - daysAgo * 86400000 - ++tick * 1000;

export function makeSeed(): AppState {
  tick = 0;
  const today = todayISO();

  const clients: Client[] = [
    {
      id: "c-maya", name: "Maya Rodriguez", email: "maya.r@gmail.com", phone: "+1 415 220 8841",
      goal: "Lose weight", startDate: addDays(today, -70), status: "Active",
      notes: "Prefers evening sessions. Knee is sensitive — swap jump landings for low-impact.",
    },
    {
      id: "c-jamal", name: "Jamal Carter", email: "jamal.carter@outlook.com", phone: "+1 312 774 5190",
      goal: "Build muscle", startDate: addDays(today, -42), status: "Active",
      notes: "Bulking phase +300 kcal. Push progressive overload on squat & bench every week.",
    },
    {
      id: "c-priya", name: "Priya Nair", email: "priya.nair@yahoo.com", phone: "+44 7700 900312",
      goal: "General fitness", startDate: addDays(today, -21), status: "Active",
      notes: "New to lifting. Focus on form first, load second. Loves rowing.",
    },
    {
      id: "c-tom", name: "Tom Becker", email: "tom.becker@gmx.de", phone: "+49 151 2903 778",
      goal: "Lose weight", startDate: addDays(today, -84), status: "Paused",
      notes: "Paused for a work trip until next month. Keep the plan, drop intensity on return.",
    },
    {
      id: "c-aisha", name: "Aisha Khalid", email: "aisha.k@proton.me", phone: "+971 50 442 9810",
      goal: "Build muscle", startDate: addDays(today, -14), status: "Active",
      notes: "Home gym: dumbbells up to 20kg + bands. Program around what she has.",
    },
    {
      id: "c-leo", name: "Leo Martins", email: "leo.martins@gmail.com", phone: "+351 912 445 201",
      goal: "General fitness", startDate: addDays(today, -140), status: "Completed",
      notes: "Finished the 12-week block. Check back in 6 weeks for maintenance program.",
    },
  ];

  const img = (n: string) => `/images/${n}`;
  const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " tutorial")}`;

  const exercises: Exercise[] = [
    { id: "e-bench", name: "Barbell Bench Press", category: "Chest", description: "Flat barbell press. Retract shoulder blades, bar path slightly toward lower chest.", videoUrl: yt("barbell bench press"), image: img("ex-chest.jpg") },
    { id: "e-pushup", name: "Push-up", category: "Chest", description: "Bodyweight staple. Rigid plank, chest to floor, full lockout.", videoUrl: yt("push up form"), image: img("ex-chest.jpg") },
    { id: "e-row", name: "Bent-over Barbell Row", category: "Back", description: "Hinge to ~45°, pull the bar to the lower ribs, squeeze the lats.", videoUrl: yt("barbell row"), image: img("ex-back.jpg") },
    { id: "e-deadlift", name: "Conventional Deadlift", category: "Back", description: "Brace hard, push the floor away, bar stays glued to the legs.", videoUrl: yt("deadlift"), image: img("ex-back.jpg") },
    { id: "e-pullup", name: "Pull-up", category: "Back", description: "Dead hang to chin over bar. Add bands if needed.", videoUrl: yt("pull up"), image: img("ex-back.jpg") },
    { id: "e-squat", name: "Barbell Back Squat", category: "Legs", description: "Feet shoulder width, break at hips and knees together, depth below parallel.", videoUrl: yt("back squat"), image: img("ex-legs.jpg") },
    { id: "e-rdl", name: "Romanian Deadlift", category: "Legs", description: "Soft knees, hips back, feel the hamstring stretch. Neutral spine always.", videoUrl: yt("romanian deadlift"), image: img("ex-legs.jpg") },
    { id: "e-lunge", name: "Walking Lunge", category: "Legs", description: "Long stride, back knee kisses the floor, drive through the front heel.", videoUrl: yt("walking lunge"), image: img("ex-legs.jpg") },
    { id: "e-curl", name: "Dumbbell Biceps Curl", category: "Arms", description: "Elbows pinned, no swing. 2-second negative on every rep.", videoUrl: yt("dumbbell curl"), image: img("ex-arms.jpg") },
    { id: "e-pushdown", name: "Triceps Rope Pushdown", category: "Arms", description: "Split the rope at the bottom, full lockout, control the way up.", videoUrl: yt("rope pushdown"), image: img("ex-arms.jpg") },
    { id: "e-plank", name: "Plank Hold", category: "Core", description: "Glutes tight, ribs down. Quality over duration — stop when hips sag.", videoUrl: yt("plank"), image: img("ex-core.jpg") },
    { id: "e-legraise", name: "Hanging Leg Raise", category: "Core", description: "Dead hang, toes to bar. No swinging — reset each rep if you kip.", videoUrl: yt("hanging leg raise"), image: img("ex-core.jpg") },
    { id: "e-rower", name: "Rowing Machine Intervals", category: "Cardio", description: "500m hard / 90s easy ×6. Damper 4–5, drive with the legs.", videoUrl: yt("rowing machine workout"), image: img("ex-cardio.jpg") },
    { id: "e-bike", name: "Assault Bike Sprints", category: "Cardio", description: "20s all-out / 40s coast ×8. Finisher only — keep technique honest.", videoUrl: yt("assault bike"), image: img("ex-cardio.jpg") },
  ];

  const pi = (clientId: string, day: number, exerciseId: string, sets: number, reps: number, rest: number, notes = ""): PlanItem => ({
    id: `p-${clientId}-${day}-${exerciseId}`, clientId, day, exerciseId, sets, reps, rest, notes,
  });

  const plans: PlanItem[] = [
    // Maya — Day 1 (lower) / 2 (push) / 3 (pull) / 4 (cardio+core) / 5 (full body) / 6 light
    pi("c-maya", 1, "e-squat", 4, 8, 90, "Tempo 3-1-1. Stop 2 reps shy of failure."),
    pi("c-maya", 1, "e-rdl", 3, 10, 75),
    pi("c-maya", 1, "e-lunge", 3, 12, 60, "Bodyweight or light DBs."),
    pi("c-maya", 2, "e-bench", 4, 8, 90),
    pi("c-maya", 2, "e-pushup", 3, 12, 60, "To failure on the last set."),
    pi("c-maya", 3, "e-row", 4, 10, 75),
    pi("c-maya", 3, "e-pullup", 3, 6, 90, "Band assist OK."),
    pi("c-maya", 4, "e-rower", 1, 6, 90, "500m intervals — see description."),
    pi("c-maya", 4, "e-plank", 3, 1, 45, "45–60s holds."),
    pi("c-maya", 5, "e-squat", 3, 10, 75, "Lighter than Day 1."),
    pi("c-maya", 5, "e-bench", 3, 10, 75),
    pi("c-maya", 5, "e-row", 3, 10, 75),
    pi("c-maya", 6, "e-rower", 1, 1, 0, "Steady 30 min, conversational pace."),
    pi("c-maya", 6, "e-plank", 3, 1, 45),
    // Jamal — push / pull / legs / upper / arms
    pi("c-jamal", 1, "e-bench", 5, 5, 120, "Add 2.5kg when all sets land."),
    pi("c-jamal", 1, "e-pushup", 3, 15, 60, "Weighted if 15 feels easy."),
    pi("c-jamal", 1, "e-pushdown", 3, 12, 60),
    pi("c-jamal", 2, "e-deadlift", 4, 5, 150, "Top set heavy, then back-off sets."),
    pi("c-jamal", 2, "e-row", 4, 8, 90),
    pi("c-jamal", 2, "e-pullup", 4, 8, 90, "Add weight when bodyweight x8 is clean."),
    pi("c-jamal", 3, "e-squat", 5, 5, 120),
    pi("c-jamal", 3, "e-rdl", 3, 8, 90),
    pi("c-jamal", 3, "e-lunge", 3, 10, 75),
    pi("c-jamal", 4, "e-bench", 4, 8, 90, "Volume day — lighter than Monday."),
    pi("c-jamal", 4, "e-row", 4, 10, 75),
    pi("c-jamal", 5, "e-curl", 4, 10, 60),
    pi("c-jamal", 5, "e-pushdown", 4, 12, 60),
    pi("c-jamal", 5, "e-legraise", 3, 12, 60),
    // Priya — 3 full-body days + cardio
    pi("c-priya", 1, "e-squat", 3, 8, 90, "Goblet squat until barbell feels easy."),
    pi("c-priya", 1, "e-pushup", 3, 8, 75, "Incline push-ups if needed."),
    pi("c-priya", 1, "e-row", 3, 10, 75),
    pi("c-priya", 2, "e-rower", 1, 1, 0, "20 min steady state."),
    pi("c-priya", 2, "e-plank", 3, 1, 45),
    pi("c-priya", 3, "e-rdl", 3, 10, 75),
    pi("c-priya", 3, "e-pullup", 3, 5, 90, "Band assist, slow negatives."),
    pi("c-priya", 3, "e-curl", 2, 12, 60),
    pi("c-priya", 4, "e-lunge", 3, 10, 60),
    pi("c-priya", 4, "e-legraise", 3, 10, 60),
  ];

  const meal = (clientId: string, type: MealType, description: string, calories: number, protein: number, carbs: number, fats: number): Meal => ({
    id: `m-${clientId}-${type}`, clientId, type, description, calories, protein, carbs, fats,
  });

  const meals: Meal[] = [
    meal("c-maya", "Breakfast", "Oats + berries + scoop of whey, black coffee", 380, 32, 48, 7),
    meal("c-maya", "Lunch", "Grilled chicken, jasmine rice, big green salad", 620, 45, 62, 12),
    meal("c-maya", "Dinner", "Baked salmon, roasted sweet potato, broccoli", 540, 38, 34, 24),
    meal("c-maya", "Snack", "Greek yogurt + almonds", 210, 18, 12, 9),
    meal("c-jamal", "Breakfast", "4 eggs, 2 toast, avocado, glass of milk", 720, 38, 48, 36),
    meal("c-jamal", "Lunch", "Beef bowl: rice, minced beef, olive oil drizzle", 850, 52, 78, 28),
    meal("c-jamal", "Dinner", "Chicken thighs, pasta, parmesan", 780, 55, 72, 24),
    meal("c-jamal", "Snack", "Casein shake + peanut butter on rice cakes", 420, 35, 38, 14),
    meal("c-priya", "Breakfast", "Greek yogurt, granola, banana", 420, 22, 58, 10),
    meal("c-priya", "Lunch", "Tuna wrap, hummus, crunchy veg", 520, 34, 52, 16),
    meal("c-priya", "Dinner", "Tofu stir-fry, brown rice, sesame", 560, 26, 68, 18),
  ];

  const ci = (clientId: string, daysAgo: number, weight: number, waist: number | undefined, mood: number, water: number, workoutDone: boolean, notes?: string): CheckIn => ({
    id: `ci-${clientId}-${daysAgo}-${tick}`, clientId, date: addDays(today, -daysAgo), ts: ts(daysAgo),
    weight, waist, mood, water, workoutDone, notes,
  });

  const checkIns: CheckIn[] = [
    ci("c-maya", 0, 75.9, 71, 4, 2.5, true, "Felt strong on squats, hit all sets."),
    ci("c-maya", 2, 76.3, 71.5, 3, 2.0, true),
    ci("c-maya", 4, 76.6, 72, 4, 2.5, false, "Skipped — late meeting."),
    ci("c-maya", 6, 76.9, 72, 3, 1.8, true),
    ci("c-maya", 9, 77.4, 73, 4, 2.2, true),
    ci("c-maya", 13, 77.9, 73.5, 2, 1.5, true, "Sore from lunges."),
    ci("c-maya", 17, 78.6, 74, 3, 2.0, true),
    ci("c-jamal", 0, 83.4, 84, 5, 3.0, true, "Deadlift PR: 160kg x3."),
    ci("c-jamal", 1, 83.1, 84, 4, 2.8, true),
    ci("c-jamal", 3, 82.9, 84.5, 4, 3.2, true),
    ci("c-jamal", 6, 82.4, 85, 3, 2.5, false),
    ci("c-jamal", 10, 82.0, 85, 4, 2.7, true),
    ci("c-priya", 1, 61.2, 68, 4, 2.0, true, "Rowing 20 min without stopping!"),
    ci("c-priya", 3, 61.5, 68.5, 3, 1.6, true),
    ci("c-priya", 5, 61.8, 69, 3, 1.5, false, "Travel day."),
    ci("c-priya", 8, 62.1, 69, 4, 2.1, true),
    ci("c-tom", 12, 91.0, 96, 2, 1.2, false, "Last check-in before the trip."),
    ci("c-aisha", 2, 58.6, 64, 4, 2.4, true),
    ci("c-aisha", 5, 58.9, 64.5, 3, 2.0, true, "Band pull-ups getting smoother."),
  ];

  return { clients, exercises, plans, checkIns, meals };
}
