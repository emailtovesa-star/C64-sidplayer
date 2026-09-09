package com.example.c64sidplayersimple;

import android.app.*;
import android.content.Intent;
import android.media.*;
import android.os.*;
import android.util.Base64;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

public class PlaybackService extends Service {
    private static final String CHANNEL="sid_playback_v362";
    private static final int ID=64, SAMPLE_RATE=44100, CHANNELS=2, BYTES_PER_SAMPLE=2;
    private static final int BYTES_PER_SECOND=SAMPLE_RATE*CHANNELS*BYTES_PER_SAMPLE;
    private static final LinkedBlockingQueue<byte[]> queue=new LinkedBlockingQueue<>();
    private static final AtomicInteger queuedBytes=new AtomicInteger(0);
    private static final Object audioLock=new Object();
    private static volatile boolean running=false, needsPlay=true;
    private static AudioTrack audioTrack;
    private static Thread writerThread;
    private static long headBase=0;
    private PowerManager.WakeLock wakeLock;

    private static long unsignedHead(AudioTrack t){
        return ((long)t.getPlaybackHeadPosition()) & 0xffffffffL;
    }

    public static void enqueueBase64(String data){
        if(data==null||data.isEmpty())return;
        try{byte[] pcm=Base64.decode(data,Base64.NO_WRAP);
            queuedBytes.addAndGet(pcm.length);queue.offer(pcm);}catch(Throwable ignored){}
    }

    public static void resetOutput(){
        queue.clear();queuedBytes.set(0);
        synchronized(audioLock){
            AudioTrack t=audioTrack;
            if(t!=null){
                try{t.pause();}catch(Throwable ignored){}
                try{t.flush();}catch(Throwable ignored){}
                try{headBase=unsignedHead(t);}catch(Throwable ignored){headBase=0;}
            } else headBase=0;
            needsPlay=true;
        }
    }
    public static void clearQueue(){resetOutput();}

    public static void pauseOutput(){
        synchronized(audioLock){
            AudioTrack t=audioTrack;
            if(t!=null){
                try{t.pause();}catch(Throwable ignored){}
            }
        }
    }

    public static void resumeOutput(){
        synchronized(audioLock){
            AudioTrack t=audioTrack;
            if(t!=null){
                try{
                    t.play();
                    needsPlay=false;
                }catch(Throwable ignored){}
            }
        }
    }

    public static int getBufferedMs(){
        return (int)Math.max(0,Math.min(600000,(queuedBytes.get()*1000L)/BYTES_PER_SECOND));
    }

    public static long getPlayedMs(){
        synchronized(audioLock){
            AudioTrack t=audioTrack;
            if(t==null)return 0;
            try{
                long now=unsignedHead(t);
                long frames=(now-headBase)&0xffffffffL;
                return Math.max(0,(frames*1000L)/SAMPLE_RATE);
            }catch(Throwable ignored){return 0;}
        }
    }

    @Override public void onCreate(){
        super.onCreate();

        // Keep the CPU awake while SID audio is active. Without this, Android
        // can let the WebView/WASM producer sleep after the app is backgrounded,
        // leaving only the already-buffered PCM (often about a minute).
        try{
            PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
            wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,
                getPackageName()+":SIDPlayback");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        }catch(Throwable ignored){}

        createNotification();
        startAudio();
    }

    private void createNotification(){
        NotificationManager nm=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"SID playback",NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Native PCM playback for C64 SID Player");nm.createNotificationChannel(ch);
        }
        Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi=PendingIntent.getActivity(this,0,launch,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setContentTitle("C64 SID Player").setContentText("Native SID audio playback active")
         .setSmallIcon(android.R.drawable.ic_media_play).setContentIntent(pi).setOngoing(true);
        startForeground(ID,b.build());
    }

    private AudioTrack makeTrack(){
        int min=AudioTrack.getMinBufferSize(SAMPLE_RATE,AudioFormat.CHANNEL_OUT_STEREO,AudioFormat.ENCODING_PCM_16BIT);
        int bufferSize=Math.max(min*4,SAMPLE_RATE*CHANNELS*BYTES_PER_SAMPLE);
        AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        AudioFormat fmt=new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build();
        return new AudioTrack(attrs,fmt,bufferSize,AudioTrack.MODE_STREAM,android.media.AudioManager.AUDIO_SESSION_ID_GENERATE);
    }

    private void startAudio(){
        if(running)return;running=true;
        synchronized(audioLock){audioTrack=makeTrack();needsPlay=true;headBase=unsignedHead(audioTrack);}
        writerThread=new Thread(()->{
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);
            while(running){
                try{
                    byte[] pcm=queue.take();int off=0;
                    while(running&&off<pcm.length){
                        AudioTrack t;
                        synchronized(audioLock){
                            t=audioTrack;if(t==null)break;
                            if(needsPlay){try{t.play();}catch(Throwable ignored){}needsPlay=false;}
                        }
                        int n=t.write(pcm,off,pcm.length-off,AudioTrack.WRITE_BLOCKING);
                        if(n>0){off+=n;queuedBytes.addAndGet(-n);}
                        else if(n<0){queuedBytes.addAndGet(-(pcm.length-off));break;}
                    }
                }catch(InterruptedException e){break;}catch(Throwable ignored){}
            }
        },"SID-AudioWriter");writerThread.start();
    }

    private void stopAudio(){
        running=false;if(writerThread!=null)writerThread.interrupt();writerThread=null;
        queue.clear();queuedBytes.set(0);
        synchronized(audioLock){
            if(audioTrack!=null){
                try{audioTrack.pause();}catch(Throwable ignored){}
                try{audioTrack.flush();}catch(Throwable ignored){}
                try{audioTrack.stop();}catch(Throwable ignored){}
                try{audioTrack.release();}catch(Throwable ignored){}
                audioTrack=null;
            }
            needsPlay=true;headBase=0;
        }
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(!running)startAudio();
        return START_STICKY;
    }

    @Override public void onTaskRemoved(Intent rootIntent){
        // The media foreground service remains active even if the UI task leaves
        // the foreground. START_STICKY allows Android to recreate it if needed.
        super.onTaskRemoved(rootIntent);
    }

    @Override public void onDestroy(){
        stopAudio();
        try{
            if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();
        }catch(Throwable ignored){}
        wakeLock=null;
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent){return null;}
}
