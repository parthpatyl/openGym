package ch.duartesantos.opengym;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class WorkoutWidgetManager {
    private static final String TAG = "WorkoutWidget";
    private static final String STATE_FILE = "opengym-state.json";

    public static final String ACTION_WEIGHT_MINUS = "ch.duartesantos.opengym.WIDGET_ACTION_WEIGHT_MINUS";
    public static final String ACTION_WEIGHT_PLUS = "ch.duartesantos.opengym.WIDGET_ACTION_WEIGHT_PLUS";
    public static final String ACTION_REPS_MINUS = "ch.duartesantos.opengym.WIDGET_ACTION_REPS_MINUS";
    public static final String ACTION_REPS_PLUS = "ch.duartesantos.opengym.WIDGET_ACTION_REPS_PLUS";
    public static final String ACTION_LOG_SET = "ch.duartesantos.opengym.WIDGET_ACTION_LOG_SET";
    public static final String ACTION_REST_PLUS_15 = "ch.duartesantos.opengym.WIDGET_ACTION_REST_PLUS_15";
    public static final String ACTION_REST_SKIP = "ch.duartesantos.opengym.WIDGET_ACTION_REST_SKIP";
    public static final String ACTION_OPEN_APP = "ch.duartesantos.opengym.WIDGET_ACTION_OPEN_APP";

    private static final Map<String, String> ACCENTS = new HashMap<>();
    static {
        ACCENTS.put("lime", "#30D158");
        ACCENTS.put("sky", "#0A84FF");
        ACCENTS.put("orange", "#FF9F0A");
        ACCENTS.put("violet", "#BF5AF2");
        ACCENTS.put("pink", "#FF375F");
        ACCENTS.put("red", "#FF453A");
        ACCENTS.put("teal", "#40C8E0");
        ACCENTS.put("gold", "#FFD60A");
    }

    public static synchronized JSONObject loadState(Context context) {
        try {
            File file = new File(context.getFilesDir(), STATE_FILE);
            if (!file.exists()) return null;

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }
            return new JSONObject(sb.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error loading state from " + STATE_FILE, e);
            return null;
        }
    }

    public static synchronized boolean saveState(Context context, JSONObject state) {
        try {
            File dir = context.getFilesDir();
            File tempFile = new File(dir, STATE_FILE + ".tmp");
            File targetFile = new File(dir, STATE_FILE);

            state.put("_ts", System.currentTimeMillis());

            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(state.toString(2).getBytes(StandardCharsets.UTF_8));
                fos.flush();
            }

            if (tempFile.renameTo(targetFile) || (!targetFile.exists() && tempFile.renameTo(targetFile))) {
                WorkoutWidgetPlugin.notifyStateChanged(context);
                return true;
            } else {
                try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                    fos.write(state.toString(2).getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                }
                tempFile.delete();
                WorkoutWidgetPlugin.notifyStateChanged(context);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error saving state to " + STATE_FILE, e);
            return false;
        }
    }

    public static String getAccentHex(JSONObject state) {
        if (state == null) return "#30D158";
        String key = state.optString("accent", "lime");
        String hex = ACCENTS.get(key);
        return hex != null ? hex : "#30D158";
    }

    public static int parseColorSafe(String hex, String fallback) {
        try {
            return Color.parseColor(hex);
        } catch (Exception e) {
            try {
                return Color.parseColor(fallback);
            } catch (Exception ex) {
                return Color.parseColor("#30D158");
            }
        }
    }

    public static class ActiveSetInfo {
        public int entryIndex;
        public int setIndex;
        public int totalSetsInEntry;
        public int totalEntries;
        public String exerciseName;
        public String exerciseId;
        public double weight;
        public int reps;
        public String unit;
        public JSONObject entryJson;
        public JSONObject setJson;
        public boolean allWorkoutDone;
    }

    public static ActiveSetInfo getActiveSetInfo(JSONObject state) {
        if (state == null) return null;
        JSONObject active = state.optJSONObject("active");
        if (active == null) return null;

        JSONArray entries = active.optJSONArray("entries");
        if (entries == null || entries.length() == 0) return null;

        int totalEntries = entries.length();
        String unit = state.optString("unit", "kg");
        int cur = active.optInt("cur", 0);
        if (cur < 0 || cur >= entries.length()) cur = 0;

        // Find the first uncompleted set starting from cur entry
        for (int eIdx = cur; eIdx < entries.length(); eIdx++) {
            JSONObject entry = entries.optJSONObject(eIdx);
            if (entry == null) continue;
            JSONArray sets = entry.optJSONArray("sets");
            if (sets == null) continue;

            for (int sIdx = 0; sIdx < sets.length(); sIdx++) {
                JSONObject s = sets.optJSONObject(sIdx);
                if (s != null && !s.optBoolean("done", false)) {
                    ActiveSetInfo info = new ActiveSetInfo();
                    info.entryIndex = eIdx;
                    info.setIndex = sIdx;
                    info.totalSetsInEntry = sets.length();
                    info.totalEntries = totalEntries;
                    info.exerciseId = entry.optString("id", "Exercise");
                    String rawName = entry.optString("name", "");
                    if (rawName.isEmpty()) {
                        rawName = info.exerciseId.replace("_", " ").replace("-", " ");
                    }
                    info.exerciseName = RestTimerManager.toTitleCase(rawName);
                    info.weight = s.optDouble("w", 0.0);
                    info.reps = s.optInt("r", 0);
                    info.unit = unit;
                    info.entryJson = entry;
                    info.setJson = s;
                    info.allWorkoutDone = false;
                    return info;
                }
            }
        }

        // If not found from cur to end, check earlier entries (0 to cur)
        for (int eIdx = 0; eIdx < cur; eIdx++) {
            JSONObject entry = entries.optJSONObject(eIdx);
            if (entry == null) continue;
            JSONArray sets = entry.optJSONArray("sets");
            if (sets == null) continue;

            for (int sIdx = 0; sIdx < sets.length(); sIdx++) {
                JSONObject s = sets.optJSONObject(sIdx);
                if (s != null && !s.optBoolean("done", false)) {
                    ActiveSetInfo info = new ActiveSetInfo();
                    info.entryIndex = eIdx;
                    info.setIndex = sIdx;
                    info.totalSetsInEntry = sets.length();
                    info.totalEntries = totalEntries;
                    info.exerciseId = entry.optString("id", "Exercise");
                    String rawName = entry.optString("name", "");
                    if (rawName.isEmpty()) {
                        rawName = info.exerciseId.replace("_", " ").replace("-", " ");
                    }
                    info.exerciseName = RestTimerManager.toTitleCase(rawName);
                    info.weight = s.optDouble("w", 0.0);
                    info.reps = s.optInt("r", 0);
                    info.unit = unit;
                    info.entryJson = entry;
                    info.setJson = s;
                    info.allWorkoutDone = false;
                    return info;
                }
            }
        }

        // All sets in workout are complete
        ActiveSetInfo completeInfo = new ActiveSetInfo();
        completeInfo.allWorkoutDone = true;
        completeInfo.totalEntries = totalEntries;
        return completeInfo;
    }

    public static void adjustActiveWeight(Context context, double delta) {
        JSONObject state = loadState(context);
        ActiveSetInfo info = getActiveSetInfo(state);
        if (info == null || info.allWorkoutDone || info.setJson == null) return;

        double curW = info.weight;
        double newW = Math.max(0.0, Math.round((curW + delta) * 10.0) / 10.0);
        try {
            info.setJson.put("w", newW);
            saveState(context, state);
            updateAllWidgets(context);
        } catch (Exception e) {
            Log.e(TAG, "Error adjusting weight", e);
        }
    }

    public static void adjustActiveReps(Context context, int delta) {
        JSONObject state = loadState(context);
        ActiveSetInfo info = getActiveSetInfo(state);
        if (info == null || info.allWorkoutDone || info.setJson == null) return;

        int curR = info.reps;
        int newR = Math.max(0, curR + delta);
        try {
            info.setJson.put("r", newR);
            saveState(context, state);
            updateAllWidgets(context);
        } catch (Exception e) {
            Log.e(TAG, "Error adjusting reps", e);
        }
    }

    public static void logActiveSet(Context context) {
        JSONObject state = loadState(context);
        ActiveSetInfo info = getActiveSetInfo(state);
        if (info == null || info.allWorkoutDone || info.setJson == null) return;

        try {
            info.setJson.put("done", true);

            // Check if all sets in this entry are completed
            JSONObject active = state.optJSONObject("active");
            JSONArray entries = active != null ? active.optJSONArray("entries") : null;
            if (entries != null) {
                JSONArray sets = info.entryJson.optJSONArray("sets");
                boolean entryDone = true;
                if (sets != null) {
                    for (int i = 0; i < sets.length(); i++) {
                        if (!sets.optJSONObject(i).optBoolean("done", false)) {
                            entryDone = false;
                            break;
                        }
                    }
                }
                if (entryDone && info.entryIndex + 1 < entries.length()) {
                    active.put("cur", info.entryIndex + 1);
                }
            }

            saveState(context, state);

            // Determine if workout is complete or what next set is
            ActiveSetInfo nextInfo = getActiveSetInfo(state);
            if (nextInfo == null || nextInfo.allWorkoutDone) {
                RestTimerManager.getInstance(context).stop();
            } else {
                int restSec = state.optInt("restSec", 90);
                String accentHex = getAccentHex(state);
                String setLabel = "Set " + (nextInfo.setIndex + 1) + "/" + nextInfo.totalSetsInEntry;
                RestTimerManager.getInstance(context).start(restSec, nextInfo.exerciseName, setLabel, accentHex);
            }

            updateAllWidgets(context);
        } catch (Exception e) {
            Log.e(TAG, "Error logging active set", e);
        }
    }

    public static void addRest(Context context, int seconds) {
        RestTimerManager.getInstance(context).addSeconds(seconds);
        updateAllWidgets(context);
    }

    public static void skipRest(Context context) {
        RestTimerManager.getInstance(context).stop();
        updateAllWidgets(context);
    }

    private static Bitmap createPillBitmap(Context context, int color, int widthDp, int heightDp, float cornerRadiusDp) {
        try {
            float density = context.getResources().getDisplayMetrics().density;
            int widthPx = Math.max(1, (int) (widthDp * density));
            int heightPx = Math.max(1, (int) (heightDp * density));
            float cornerRadiusPx = cornerRadiusDp * density;

            Bitmap bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(color);
            paint.setStyle(Paint.Style.FILL);
            RectF rect = new RectF(0, 0, widthPx, heightPx);
            canvas.drawRoundRect(rect, cornerRadiusPx, cornerRadiusPx, paint);
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap createProgressBarBitmap(Context context, int filledColor, int trackColor, int widthDp, int heightDp, float percent, float cornerRadiusDp) {
        try {
            float density = context.getResources().getDisplayMetrics().density;
            int widthPx = Math.max(1, (int) (widthDp * density));
            int heightPx = Math.max(1, (int) (heightDp * density));
            float cornerRadiusPx = cornerRadiusDp * density;

            Bitmap bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            trackPaint.setColor(trackColor);
            trackPaint.setStyle(Paint.Style.FILL);
            RectF trackRect = new RectF(0, 0, widthPx, heightPx);
            canvas.drawRoundRect(trackRect, cornerRadiusPx, cornerRadiusPx, trackPaint);

            if (percent > 0f) {
                Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                fillPaint.setColor(filledColor);
                fillPaint.setStyle(Paint.Style.FILL);
                float fillWidth = Math.max(heightPx, widthPx * Math.min(1.0f, percent));
                RectF fillRect = new RectF(0, 0, fillWidth, heightPx);
                canvas.drawRoundRect(fillRect, cornerRadiusPx, cornerRadiusPx, fillPaint);
            }
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    public static RemoteViews buildRemoteViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_workout);

        // App launch pending intent
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent openAppPending = PendingIntent.getActivity(context, 1001, appIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

        RestTimerManager timerManager = RestTimerManager.getInstance(context);
        boolean isResting = timerManager.isRunning();

        if (isResting) {
            // ==================== REST STATE (APPLE HIG / MINIMAL) ====================
            views.setViewVisibility(R.id.widget_layout_rest, View.VISIBLE);
            views.setViewVisibility(R.id.widget_layout_active, View.GONE);
            views.setViewVisibility(R.id.widget_layout_complete, View.GONE);
            views.setViewVisibility(R.id.widget_layout_standby, View.GONE);

            int remaining = timerManager.getRemainingSeconds();
            String timeStr = String.format(Locale.getDefault(), "%02d:%02d", remaining / 60, remaining % 60);
            views.setTextViewText(R.id.widget_rest_countdown, timeStr);

            String accentHex = timerManager.getAccentColor();
            int themeColor = parseColorSafe(accentHex, "#30D158");
            views.setTextColor(R.id.widget_rest_status, themeColor);

            JSONObject state = loadState(context);
            ActiveSetInfo nextInfo = getActiveSetInfo(state);
            String nextExerciseName = "";
            String nextTargetShort = "";
            if (nextInfo != null && !nextInfo.allWorkoutDone) {
                nextExerciseName = nextInfo.exerciseName;
                String weightStr = (nextInfo.weight == (long) nextInfo.weight ? String.format(Locale.getDefault(), "%d", (long) nextInfo.weight) : String.format(Locale.getDefault(), "%.1f", nextInfo.weight)) + " " + nextInfo.unit;
                nextTargetShort = weightStr + " × " + nextInfo.reps + " reps";
                views.setTextViewText(R.id.widget_rest_next_set_badge, "EX " + (nextInfo.entryIndex + 1) + "/" + nextInfo.totalEntries + " · SET " + (nextInfo.setIndex + 1) + "/" + nextInfo.totalSetsInEntry);
            } else {
                nextExerciseName = timerManager.getExerciseName();
                nextTargetShort = timerManager.getSetInfo();
                views.setTextViewText(R.id.widget_rest_next_set_badge, timerManager.getSetInfo());
            }

            String nextTitle = "Next: " + nextExerciseName;
            String nextSub = "";
            if (nextInfo != null && !nextInfo.allWorkoutDone) {
                String setSub = "Set " + (nextInfo.setIndex + 1) + "/" + nextInfo.totalSetsInEntry;
                nextSub = setSub + " · " + nextTargetShort;
            } else if (!nextTargetShort.isEmpty()) {
                nextSub = nextTargetShort;
            }
            views.setTextViewText(R.id.widget_rest_next_exercise, nextTitle);
            views.setTextViewText(R.id.widget_rest_next_subtext, nextSub);

            // Progress bar: edge-to-edge (match_parent → use max widget content width ~360dp)
            int total = Math.max(1, timerManager.getTotalDurationSec());
            float progressPercent = ((float) (total - remaining)) / ((float) total);
            Bitmap barBmp = createProgressBarBitmap(context, themeColor, parseColorSafe("#24262C", "#24262C"), 360, 5, progressPercent, 2.5f);
            if (barBmp != null) {
                views.setImageViewBitmap(R.id.widget_rest_progress_bar, barBmp);
            }

            // +15s pending intent
            Intent plusIntent = new Intent(context, WorkoutWidgetProvider.class);
            plusIntent.setAction(ACTION_REST_PLUS_15);
            PendingIntent plusPending = PendingIntent.getBroadcast(context, 1002, plusIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_rest_plus_15, plusPending);

            // Skip pending intent
            Intent skipIntent = new Intent(context, WorkoutWidgetProvider.class);
            skipIntent.setAction(ACTION_REST_SKIP);
            PendingIntent skipPending = PendingIntent.getBroadcast(context, 1003, skipIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_rest_skip_container, skipPending);
            views.setOnClickPendingIntent(R.id.widget_btn_rest_skip, skipPending);

            return views;
        }

        JSONObject state = loadState(context);
        ActiveSetInfo info = getActiveSetInfo(state);
        String accentHex = getAccentHex(state);
        int themeColor = parseColorSafe(accentHex, "#30D158");

        if (info != null && info.allWorkoutDone) {
            // ==================== WORKOUT COMPLETE STATE ====================
            views.setViewVisibility(R.id.widget_layout_complete, View.VISIBLE);
            views.setViewVisibility(R.id.widget_layout_active, View.GONE);
            views.setViewVisibility(R.id.widget_layout_rest, View.GONE);
            views.setViewVisibility(R.id.widget_layout_standby, View.GONE);

            Bitmap completeBtnBmp = createPillBitmap(context, themeColor, 320, 42, 21f);
            if (completeBtnBmp != null) {
                views.setImageViewBitmap(R.id.widget_btn_finish_review_bg, completeBtnBmp);
            }
            views.setOnClickPendingIntent(R.id.widget_btn_finish_review_container, openAppPending);
            views.setOnClickPendingIntent(R.id.widget_btn_finish_review, openAppPending);
            return views;
        }

        if (info != null && !info.allWorkoutDone) {
            // ==================== ACTIVE WORKOUT STATE (APPLE HIG / MINIMAL) ====================
            views.setViewVisibility(R.id.widget_layout_active, View.VISIBLE);
            views.setViewVisibility(R.id.widget_layout_rest, View.GONE);
            views.setViewVisibility(R.id.widget_layout_complete, View.GONE);
            views.setViewVisibility(R.id.widget_layout_standby, View.GONE);

            views.setTextViewText(R.id.widget_active_exercise, info.exerciseName);
            views.setTextViewText(R.id.widget_active_set_badge, "EX " + (info.entryIndex + 1) + "/" + info.totalEntries + " · SET " + (info.setIndex + 1) + "/" + info.totalSetsInEntry);
            views.setTextColor(R.id.widget_active_set_badge, themeColor);

            // Format weight (e.g. "80 kg" or "82.5 kg")
            String weightStr = (info.weight == (long) info.weight ? String.format(Locale.getDefault(), "%d", (long) info.weight) : String.format(Locale.getDefault(), "%.1f", info.weight)) + " " + info.unit;
            views.setTextViewText(R.id.widget_text_weight_val, weightStr);

            // Format reps
            String repsStr = info.reps + " reps";
            views.setTextViewText(R.id.widget_text_reps_val, repsStr);

            views.setTextViewText(R.id.widget_active_target, "Target: " + weightStr + " × " + repsStr);

            // Exercise set progress indicator (320dp content - 32dp margins = 288dp bar)
            float setProgress = (float) (info.setIndex + 1) / (float) Math.max(1, info.totalSetsInEntry);
            Bitmap activeBarBmp = createProgressBarBitmap(context, themeColor, parseColorSafe("#24262C", "#24262C"), 288, 5, setProgress, 2.5f);
            if (activeBarBmp != null) {
                views.setImageViewBitmap(R.id.widget_active_progress_bar, activeBarBmp);
            }

            // Steppers broadcast pending intents
            double weightStep = "lb".equalsIgnoreCase(info.unit) ? 5.0 : 2.5;

            Intent wMinusIntent = new Intent(context, WorkoutWidgetProvider.class);
            wMinusIntent.setAction(ACTION_WEIGHT_MINUS);
            wMinusIntent.putExtra("step", weightStep);
            views.setOnClickPendingIntent(R.id.widget_btn_weight_minus, PendingIntent.getBroadcast(context, 1004, wMinusIntent, flags));

            Intent wPlusIntent = new Intent(context, WorkoutWidgetProvider.class);
            wPlusIntent.setAction(ACTION_WEIGHT_PLUS);
            wPlusIntent.putExtra("step", weightStep);
            views.setOnClickPendingIntent(R.id.widget_btn_weight_plus, PendingIntent.getBroadcast(context, 1005, wPlusIntent, flags));

            Intent rMinusIntent = new Intent(context, WorkoutWidgetProvider.class);
            rMinusIntent.setAction(ACTION_REPS_MINUS);
            views.setOnClickPendingIntent(R.id.widget_btn_reps_minus, PendingIntent.getBroadcast(context, 1006, rMinusIntent, flags));

            Intent rPlusIntent = new Intent(context, WorkoutWidgetProvider.class);
            rPlusIntent.setAction(ACTION_REPS_PLUS);
            views.setOnClickPendingIntent(R.id.widget_btn_reps_plus, PendingIntent.getBroadcast(context, 1007, rPlusIntent, flags));

            // Log Set CTA
            Intent logIntent = new Intent(context, WorkoutWidgetProvider.class);
            logIntent.setAction(ACTION_LOG_SET);
            PendingIntent logPending = PendingIntent.getBroadcast(context, 1008, logIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_log_container, logPending);
            views.setOnClickPendingIntent(R.id.widget_btn_log_text, logPending);
            views.setTextViewText(R.id.widget_btn_log_text, "Complete Set");

            Bitmap logBtnBmp = createPillBitmap(context, themeColor, 320, 44, 22f);
            if (logBtnBmp != null) {
                views.setImageViewBitmap(R.id.widget_btn_log_bg, logBtnBmp);
            }

            return views;
        }

        // ==================== STANDBY STATE (APPLE FITNESS / MINIMAL) ====================
        views.setViewVisibility(R.id.widget_layout_standby, View.VISIBLE);
        views.setViewVisibility(R.id.widget_layout_active, View.GONE);
        views.setViewVisibility(R.id.widget_layout_rest, View.GONE);
        views.setViewVisibility(R.id.widget_layout_complete, View.GONE);

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        String todayISO = sdf.format(new Date());

        JSONObject todayW = null;
        JSONObject lastW = null;

        if (state != null) {
            JSONArray workouts = state.optJSONArray("workouts");
            if (workouts != null && workouts.length() > 0) {
                lastW = workouts.optJSONObject(workouts.length() - 1);
                // Search for workout on today's date
                for (int i = workouts.length() - 1; i >= 0; i--) {
                    JSONObject w = workouts.optJSONObject(i);
                    if (w != null && todayISO.equals(w.optString("d", ""))) {
                        todayW = w;
                        break;
                    }
                }
            }
        }

        if (todayW != null) {
            // Case 1: Workout completed today! (Apple Fitness summary style)
            views.setTextViewText(R.id.widget_standby_badge, "COMPLETED TODAY");
            views.setTextColor(R.id.widget_standby_badge, themeColor);

            String wName = todayW.optString("name", "Workout");
            views.setTextViewText(R.id.widget_standby_title, wName);

            // Compute sets, volume, duration
            int completedSets = 0;
            JSONArray entries = todayW.optJSONArray("entries");
            if (entries != null) {
                for (int i = 0; i < entries.length(); i++) {
                    JSONObject e = entries.optJSONObject(i);
                    if (e != null) {
                        JSONArray sets = e.optJSONArray("sets");
                        if (sets != null) completedSets += sets.length();
                    }
                }
            }

            double vol = todayW.optDouble("vol", 0.0);
            long startMs = todayW.optLong("start", 0);
            long endMs = todayW.optLong("end", 0);
            long durMin = (startMs > 0 && endMs > startMs) ? (endMs - startMs) / 60000 : 0;
            String unit = state != null ? state.optString("unit", "lb") : "lb";

            // Populate Apple Fitness 3-stat metric tiles
            views.setTextViewText(R.id.widget_standby_stat1_val, String.valueOf(completedSets));
            views.setTextViewText(R.id.widget_standby_stat1_lbl, "SETS");

            views.setTextViewText(R.id.widget_standby_stat2_val, String.format(Locale.getDefault(), "%,d", Math.round(vol)));
            views.setTextViewText(R.id.widget_standby_stat2_lbl, "VOL (" + unit.toUpperCase(Locale.getDefault()) + ")");

            views.setTextViewText(R.id.widget_standby_stat3_val, durMin > 0 ? (durMin + "m") : "—");
            views.setTextViewText(R.id.widget_standby_stat3_lbl, "DURATION");

            views.setTextViewText(R.id.widget_standby_last_summary, "Completed session today");

            // Tasteful secondary dark button
            Bitmap startBtnBmp = createPillBitmap(context, parseColorSafe("#24262C", "#24262C"), 320, 42, 21f);
            if (startBtnBmp != null) {
                views.setImageViewBitmap(R.id.widget_btn_start_bg, startBtnBmp);
            }
            views.setTextColor(R.id.widget_btn_start_workout, Color.WHITE);
            views.setTextViewText(R.id.widget_btn_start_workout, "+  Start Another Workout");
        } else {
            // Case 2: No workout done yet today -> check weekly plan
            String scheduledRoutineName = null;
            int scheduledExCount = 0;

            if (state != null) {
                JSONObject week = state.optJSONObject("week");
                Calendar cal = Calendar.getInstance();
                int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sun ... 6 = Sat
                String scheduledId = week != null ? week.optString(String.valueOf(dayOfWeek), "") : "";

                if (!scheduledId.isEmpty()) {
                    JSONArray routines = state.optJSONArray("routines");
                    if (routines != null) {
                        for (int i = 0; i < routines.length(); i++) {
                            JSONObject r = routines.optJSONObject(i);
                            if (r != null && scheduledId.equals(r.optString("id", ""))) {
                                scheduledRoutineName = r.optString("name", "Workout");
                                JSONArray ex = r.optJSONArray("ex");
                                scheduledExCount = ex != null ? ex.length() : 0;
                                break;
                            }
                        }
                    }
                }
            }

            if (scheduledRoutineName != null) {
                // Today has a scheduled workout!
                views.setTextViewText(R.id.widget_standby_badge, "TODAY'S PLAN");
                views.setTextColor(R.id.widget_standby_badge, Color.WHITE);

                views.setTextViewText(R.id.widget_standby_title, scheduledRoutineName);

                views.setTextViewText(R.id.widget_standby_stat1_val, String.valueOf(scheduledExCount));
                views.setTextViewText(R.id.widget_standby_stat1_lbl, "EXERCISES");

                views.setTextViewText(R.id.widget_standby_stat2_val, String.valueOf(scheduledExCount * 3));
                views.setTextViewText(R.id.widget_standby_stat2_lbl, "SETS");

                views.setTextViewText(R.id.widget_standby_stat3_val, "~45m");
                views.setTextViewText(R.id.widget_standby_stat3_lbl, "EST. TIME");

                views.setTextViewText(R.id.widget_standby_last_summary, "Planned routine for today");
            } else {
                // Rest day
                views.setTextViewText(R.id.widget_standby_badge, "REST DAY");
                views.setTextColor(R.id.widget_standby_badge, parseColorSafe("#8E8E93", "#8E8E93"));

                views.setTextViewText(R.id.widget_standby_title, "Rest & Recovery");

                JSONArray workouts = state != null ? state.optJSONArray("workouts") : null;
                int totalWorkouts = workouts != null ? workouts.length() : 0;
                views.setTextViewText(R.id.widget_standby_stat1_val, String.valueOf(totalWorkouts));
                views.setTextViewText(R.id.widget_standby_stat1_lbl, "SESSIONS");

                views.setTextViewText(R.id.widget_standby_stat2_val, "Rest");
                views.setTextViewText(R.id.widget_standby_stat2_lbl, "STATUS");

                views.setTextViewText(R.id.widget_standby_stat3_val, "Active");
                views.setTextViewText(R.id.widget_standby_stat3_lbl, "RECOVERY");

                String lastSummary = "Take a breather or do light cardio";
                if (lastW != null) {
                    String lastName = lastW.optString("name", "Workout");
                    String lastDate = lastW.optString("d", "");
                    lastSummary = "Last: " + lastName + (!lastDate.isEmpty() ? " · " + lastDate : "");
                }
                views.setTextViewText(R.id.widget_standby_last_summary, lastSummary);
            }

            // Primary accent start button
            Bitmap startBtnBmp = createPillBitmap(context, themeColor, 320, 42, 21f);
            if (startBtnBmp != null) {
                views.setImageViewBitmap(R.id.widget_btn_start_bg, startBtnBmp);
            }
            views.setTextColor(R.id.widget_btn_start_workout, Color.BLACK);
            views.setTextViewText(R.id.widget_btn_start_workout, "▶  Start Workout");
        }

        views.setOnClickPendingIntent(R.id.widget_btn_start_container, openAppPending);
        views.setOnClickPendingIntent(R.id.widget_btn_start_workout, openAppPending);

        return views;
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName provider = new ComponentName(context, WorkoutWidgetProvider.class);
            int[] appWidgetIds = manager.getAppWidgetIds(provider);
            if (appWidgetIds != null && appWidgetIds.length > 0) {
                RemoteViews views = buildRemoteViews(context);
                for (int id : appWidgetIds) {
                    manager.updateAppWidget(id, views);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating widgets", e);
        }
    }
}
