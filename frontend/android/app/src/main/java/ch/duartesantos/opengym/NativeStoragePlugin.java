package ch.duartesantos.opengym;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeStorageAccess")
public class NativeStoragePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String title = call.getString("title", "opengym-backup.json");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, title);
        startActivityForResult(call, intent, "saveFileResult");
    }

    @ActivityCallback
    public void saveFileResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                String content = call.getString("content", "");
                try (OutputStream os = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (os != null) {
                        os.write(content.getBytes(StandardCharsets.UTF_8));
                        JSObject ret = new JSObject();
                        ret.put("uri", uri.toString());
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception e) {
                    call.reject("Failed to write file: " + e.getMessage());
                    return;
                }
            }
        }
        call.reject("User cancelled file save");
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(call, intent, "openFileResult");
    }

    @ActivityCallback
    public void openFileResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try (InputStream is = getContext().getContentResolver().openInputStream(uri)) {
                    if (is != null) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line).append('\n');
                        }
                        JSObject ret = new JSObject();
                        ret.put("content", sb.toString());
                        ret.put("uri", uri.toString());
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception e) {
                    call.reject("Failed to read file: " + e.getMessage());
                    return;
                }
            }
        }
        call.reject("User cancelled file open");
    }

    @PluginMethod
    public void autoBackup(PluginCall call) {
        String content = call.getString("content", "");
        String filename = call.getString("filename", "openGym-auto-backup.json");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                Uri collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

                String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=? AND " +
                                   MediaStore.MediaColumns.RELATIVE_PATH + "=?";
                String[] selectionArgs = new String[]{filename, Environment.DIRECTORY_DOCUMENTS + "/openGym/"};

                Uri targetUri = null;
                try (Cursor cursor = resolver.query(collection, new String[]{MediaStore.MediaColumns._ID}, selection, selectionArgs, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        targetUri = ContentUris.withAppendedId(collection, id);
                    }
                }

                if (targetUri == null) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/openGym/");
                    targetUri = resolver.insert(collection, values);
                }

                if (targetUri != null) {
                    try (OutputStream os = resolver.openOutputStream(targetUri, "wt")) {
                        if (os != null) {
                            os.write(content.getBytes(StandardCharsets.UTF_8));
                            JSObject ret = new JSObject();
                            ret.put("path", Environment.DIRECTORY_DOCUMENTS + "/openGym/" + filename);
                            call.resolve(ret);
                            return;
                        }
                    }
                }
            }

            // Fallback for older versions or non-scoped storage
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "openGym");
            if (!dir.exists()) {
                dir.mkdirs();
            }
            File file = new File(dir, filename);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(content.getBytes(StandardCharsets.UTF_8));
            }
            JSObject ret = new JSObject();
            ret.put("path", file.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Auto-backup failed: " + e.getMessage());
        }
    }
}
