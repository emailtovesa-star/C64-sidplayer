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
    private static final String CHANNEL = "sid_playback_v361";
    private static final int ID = 64;
    private static final int SAMPLE_RATE = 44100;
    private static final int CHANNELS = 2;
    private static final int BYTES_PER_SAMPLE = 2;
    private static final int BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;

    private static final class PcmBlock {
        final int generation;
        final byte[] data;
        PcmBlock(int generation, byte[] data) {
            this.generation = generation;
            this.data = data;
        }
    }

    private static final LinkedBlockingQueue<PcmBlock> queue = new LinkedBlockingQueue<>();
    private static final AtomicInteger queuedBytes = new AtomicInteger(0);
    private static final AtomicInteger activeGeneration = new AtomicInteger(1);

    private static volatile boolean running = false;
    private static AudioTrack audioTrack;
    private static Thread writerThread;

    public static void beginGeneration(int generation) {
        activeGeneration.set(generation);
        queue.clear();
        queuedBytes.set(0);

        AudioTrack t = audioTrack;
        if (t != null) {
            try {
                t.pause();
                t.flush();
                t.play();
            } catch (Throwable ignored) {}
        }
    }

    public static void enqueueBase64(int generation, String data) {
        if (generation != activeGeneration.get()) return;
        if (data == null || data.isEmpty()) return;
        try {
            byte[] pcm = Base64.decode(data, Base64.NO_WRAP);
            if (generation != activeGeneration.get()) return;
            queuedBytes.addAndGet(pcm.length);
            queue.offer(new PcmBlock(generation, pcm));
        } catch (Throwable ignored) {}
    }

    public static void clearQueue() {
        beginGeneration(activeGeneration.incrementAndGet());
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
         .setContentText("V3.6.1 native audio playback active")
         .setSmallIcon(android.R.drawable.ic_media_play)
         .setContentIntent(pi)
         .setOngoing(true);

        startForeground(ID, b.build());
    }

    private void startAudio() {
        if (running) return;
        running = true;

        int min = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_STEREO,
                AudioFormat.ENCODING_PCM_16BIT);

        int bufferSize = Math.max(min * 4, SAMPLE_RATE * 4);

        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

        AudioFormat fmt = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .build();

        audioTrack = new AudioTrack(
                attrs, fmt, bufferSize,
                AudioTrack.MODE_STREAM,
                android.media.AudioManager.AUDIO_SESSION_ID_GENERATE);
        audioTrack.play();

        writerThread = new Thread(() -> {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);

            while (running) {
                try {
                    PcmBlock block = queue.take();
                    if (block.generation != activeGeneration.get()) {
                        queuedBytes.addAndGet(-block.data.length);
                        continue;
                    }

                    int off = 0;
                    while (running && off < block.data.length) {
                        if (block.generation != activeGeneration.get()) {
                            queuedBytes.addAndGet(-(block.data.length - off));
                            break;
                        }

                        int n = audioTrack.write(
                                block.data, off, block.data.length - off,
                                AudioTrack.WRITE_BLOCKING);

                        if (n > 0) {
                            off += n;
                            queuedBytes.addAndGet(-n);
                        } else if (n < 0) {
                            queuedBytes.addAndGet(-(block.data.length - off));
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

        if (audioTrack != null) {
            try { audioTrack.pause(); } catch (Throwable ignored) {}
            try { audioTrack.flush(); } catch (Throwable ignored) {}
            try { audioTrack.stop(); } catch (Throwable ignored) {}
            try { audioTrack.release(); } catch (Throwable ignored) {}
            audioTrack = null;
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
