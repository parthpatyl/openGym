package ch.duartesantos.opengym;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WorkoutWidgetNative")
public class WorkoutWidgetPlugin extends Plugin {
    private static WorkoutWidgetPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyStateChanged(Context context) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("timestamp", System.currentTimeMillis());
            instance.notifyListeners("onWidgetStateChanged", ret);
        }
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        WorkoutWidgetManager.updateAllWidgets(getContext());
        call.resolve();
    }
}
