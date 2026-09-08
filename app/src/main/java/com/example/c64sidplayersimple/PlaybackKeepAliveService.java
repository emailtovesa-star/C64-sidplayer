package com.example.c64sidplayersimple;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class PlaybackKeepAliveService extends Service {
    private static final String CHANNEL = "sid_playback";
    private static final int ID = 64;

    @Override
    public void onCreate() {
        super.onCreate();

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL,
                    "SID playback",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Keeps C64 SID playback active in the background");
            nm.createNotificationChannel(ch);
        }

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);

        b.setContentTitle("C64 SID Player")
         .setContentText("reSIDfp playback active")
         .setSmallIcon(android.R.drawable.ic_media_play)
         .setContentIntent(pi)
         .setOngoing(true);

        startForeground(ID, b.build());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
