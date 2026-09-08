package com.example.c64sidplayersimple;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

public class PlaybackService extends Service {
    private static final String CHANNEL = "sid_playback_v362";
    private static final int ID = 64;
    private static final int SAMPLE_RATE = 44100;
    private static final int CHANNELS = 2;
    private static final int BYTES_PER_SAMPLE = 2;
    private static final int BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;

    private static final LinkedBlockingQueue<byte[]> queue = new LinkedBlockingQueue<>();
    private static final AtomicInteger queuedBytes = new AtomicInteger(0);
    private static final Object audioLock = new Object();

    private static volatile boolean running = false;
    private static volatile boolean needsPlay = true;
    private static AudioTrack audioTrack;
    private static Thread writerThread;

    public static void enqueueBase64(String data) {
        if (data == null || data.isEmpty()) return;
        try {
            byte[] pcm = Base64.decode(data, Base64.NO_WRAP);
            queuedBytes.addAndGet(pcm.length);
            queue.offer(pcm);
        } catch (Throwable ignored) {}
    }

    // Important: do NOT call play() here. We resume only when the first new
    // PCM block arrives. This prevents old hardware-buffer audio from leaking.
    public static void resetOutput() {
        queue.clear();
        queuedBytes.set(0);
        synchronized (audioLock) {
            AudioTrack t = audioTrack;
            if (t != null) {
                try { t.pause(); } catch (Throwable ignored) {}
                try { t.flush(); } catch (Throwable ignored) {}
            }
            needsPlay = true;
        }
    }

    public static void clearQueue() {
        resetOutput();
    }

    public static int getBufferedMs() {
        return (int)Math.max(0, Math.min(600000,
                (queuedBytes.get() * 1000L) / BYTES_PER_SECOND));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotification();
        startAudio();
    }

    private void createNotification() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL, "SID playback", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Native PCM playback for C64 SID Player");
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
         .setContentText("V3.6.2 native audio playback active")
         .setSmallIcon(android.R.drawable.ic_media_play)
         .setContentIntent(pi)
         .setOngoing(true);

        startForeground(ID, b.build());
    }

    private AudioTrack makeTrack() {
        int min = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_STEREO,
                AudioFormat.ENCODING_PCM_16BIT);

        // Keep enough native headroom for multitasking without making tune
        // switching sluggish. Roughly 1 second minimum.
        int bufferSize = Math.max(min * 4, SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE);

        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

        AudioFormat fmt = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .build();

        return new AudioTrack(
                attrs, fmt, bufferSize,
                AudioTrack.MODE_STREAM,
                android.media.AudioManager.AUDIO_SESSION_ID_GENERATE);
    }

    private void startAudio() {
        if (running) return;
        running = true;

        synchronized (audioLock) {
            audioTrack = makeTrack();
            needsPlay = true;
        }

        writerThread = new Thread(() -> {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);

            while (running) {
                try {
                    byte[] pcm = queue.take();
                    int off = 0;

                    while (running && off < pcm.length) {
                        AudioTrack t;
                        synchronized (audioLock) {
                            t = audioTrack;
                            if (t == null) break;
                            if (needsPlay) {
                                try { t.play(); } catch (Throwable ignored) {}
                                needsPlay = false;
                            }
                        }

                        int n = t.write(
                                pcm, off, pcm.length - off,
                                AudioTrack.WRITE_BLOCKING);

                        if (n > 0) {
                            off += n;
                            queuedBytes.addAndGet(-n);
                        } else if (n < 0) {
                            queuedBytes.addAndGet(-(pcm.length - off));
                            break;
                        }
                    }
                } catch (InterruptedException e) {
                    break;
                } catch (Throwable ignored) {}
            }
        }, "SID-AudioWriter");
        writerThread.start();
    }

    private void stopAudio() {
        running = false;
        if (writerThread != null) writerThread.interrupt();
        writerThread = null;
        queue.clear();
        queuedBytes.set(0);

        synchronized (audioLock) {
            if (audioTrack != null) {
                try { audioTrack.pause(); } catch (Throwable ignored) {}
                try { audioTrack.flush(); } catch (Throwable ignored) {}
                try { audioTrack.stop(); } catch (Throwable ignored) {}
                try { audioTrack.release(); } catch (Throwable ignored) {}
                audioTrack = null;
            }
            needsPlay = true;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!running) startAudio();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopAudio();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
