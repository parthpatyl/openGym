package ch.duartesantos.opengym;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class WorkoutWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "WorkoutWidgetProvider";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        super.onUpdate(context, appWidgetManager, appWidgetIds);
        WorkoutWidgetManager.updateAllWidgets(context);
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        WorkoutWidgetManager.updateAllWidgets(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;

        Log.d(TAG, "onReceive action: " + action);

        if (WorkoutWidgetManager.ACTION_WEIGHT_MINUS.equals(action)) {
            double step = intent.getDoubleExtra("step", 2.5);
            WorkoutWidgetManager.adjustActiveWeight(context, -step);
        } else if (WorkoutWidgetManager.ACTION_WEIGHT_PLUS.equals(action)) {
            double step = intent.getDoubleExtra("step", 2.5);
            WorkoutWidgetManager.adjustActiveWeight(context, step);
        } else if (WorkoutWidgetManager.ACTION_REPS_MINUS.equals(action)) {
            WorkoutWidgetManager.adjustActiveReps(context, -1);
        } else if (WorkoutWidgetManager.ACTION_REPS_PLUS.equals(action)) {
            WorkoutWidgetManager.adjustActiveReps(context, 1);
        } else if (WorkoutWidgetManager.ACTION_LOG_SET.equals(action)) {
            WorkoutWidgetManager.logActiveSet(context);
        } else if (WorkoutWidgetManager.ACTION_REST_PLUS_15.equals(action)) {
            WorkoutWidgetManager.addRest(context, 15);
        } else if (WorkoutWidgetManager.ACTION_REST_SKIP.equals(action)) {
            WorkoutWidgetManager.skipRest(context);
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            WorkoutWidgetManager.updateAllWidgets(context);
        }
    }
}
