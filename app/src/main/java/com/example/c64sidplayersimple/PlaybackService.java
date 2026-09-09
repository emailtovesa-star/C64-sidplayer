package com.example.c64sidplayersimple;

import android.app.*;
import android.content.Intent;
import android.media.*;
import android.os.*;
import java.util.concurrent.atomic.AtomicLong;

public class PlaybackService extends Service {
    private static final String CHANNEL="sid_playback_v400";
    private static final int ID=64, SAMPLE_RATE=44100, CHANNELS=2;
    private static final Object lock=new Object();

    private static PlaybackService instance;
    private AudioTrack audioTrack;
    private Thread renderThread;
    private volatile boolean serviceRunning=false;
    private volatile boolean playing=false;
    private volatile boolean sidLoaded=false;
    private volatile boolean needsRestart=false;
    private volatile boolean loopEnabled=false;
    private volatile long loopLengthMs=0;
    private volatile long renderedFrames=0;
    private volatile long playedBaseFrames=0;

    private PowerManager.WakeLock wakeLock;
    private final AtomicLong generation=new AtomicLong(1);

    private static long unsignedHead(AudioTrack t) {
        return ((long)t.getPlaybackHeadPosition()) & 0xffffffffL;
    }

    public static boolean loadSid(byte[] data,int subsong) {
        PlaybackService s=instance;
        if(s==null||data==null)return false;
        synchronized(lock) {
            s.generation.incrementAndGet();
            s.playing=false;
            try { if(s.audioTrack!=null){s.audioTrack.pause();s.audioTrack.flush();} } catch(Throwable ignored){}
            boolean ok;
            try { ok=NativeSid.nativeLoad(data,subsong); } catch(Throwable t){ ok=false; }
            s.sidLoaded=ok;
            s.renderedFrames=0;
            s.playedBaseFrames=s.audioTrack!=null?unsignedHead(s.audioTrack):0;
            return ok;
        }
    }

    public static void playNative() {
        PlaybackService s=instance;if(s==null||!s.sidLoaded)return;
        synchronized(lock){
            try{if(s.audioTrack!=null)s.audioTrack.play();}catch(Throwable ignored){}
            s.playing=true;
            lock.notifyAll();
        }
    }

    public static void pauseNative() {
        PlaybackService s=instance;if(s==null)return;
        synchronized(lock){
            s.playing=false;
            try{if(s.audioTrack!=null)s.audioTrack.pause();}catch(Throwable ignored){}
        }
    }

    public static void restartNative() {
        PlaybackService s=instance;if(s==null||!s.sidLoaded)return;
        synchronized(lock){
            s.generation.incrementAndGet();
            s.playing=false;
            try{if(s.audioTrack!=null){s.audioTrack.pause();s.audioTrack.flush();}}catch(Throwable ignored){}
            try{NativeSid.nativeRestart();}catch(Throwable ignored){}
            s.renderedFrames=0;
            s.playedBaseFrames=s.audioTrack!=null?unsignedHead(s.audioTrack):0;
            s.playing=true;
            try{if(s.audioTrack!=null)s.audioTrack.play();}catch(Throwable ignored){}
            lock.notifyAll();
        }
    }

    public static void setLoop(boolean enabled,long durationMs) {
        PlaybackService s=instance;if(s==null)return;
        s.loopEnabled=enabled;
        s.loopLengthMs=Math.max(0,durationMs);
    }

    public static long getPlayedMs() {
        PlaybackService s=instance;if(s==null||s.audioTrack==null)return 0;
        synchronized(lock){
            try{
                long now=unsignedHead(s.audioTrack);
                long frames=(now-s.playedBaseFrames)&0xffffffffL;
                long ms=(frames*1000L)/SAMPLE_RATE;
                if(s.loopEnabled&&s.loopLengthMs>0) ms%=s.loopLengthMs;
                return Math.max(0,ms);
            }catch(Throwable ignored){return 0;}
        }
    }

    public static int getBufferedMs(){ return 0; }

    @Override public void onCreate(){
        super.onCreate(); instance=this;
        try{
            PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
            wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,getPackageName()+":NativeSID");
            wakeLock.setReferenceCounted(false); wakeLock.acquire();
        }catch(Throwable ignored){}
        createNotification(); startAudio();
    }

    private void createNotification(){
        NotificationManager nm=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"SID playback",NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Native C64 SID playback"); nm.createNotificationChannel(ch);
        }
        Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi=PendingIntent.getActivity(this,0,launch,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setContentTitle("C64 SID Player V4.0")
         .setContentText("Native reSIDfp playback active")
         .setSmallIcon(android.R.drawable.ic_media_play)
         .setContentIntent(pi).setOngoing(true);
        startForeground(ID,b.build());
    }

    private AudioTrack makeTrack(){
        int min=AudioTrack.getMinBufferSize(SAMPLE_RATE,AudioFormat.CHANNEL_OUT_STEREO,AudioFormat.ENCODING_PCM_16BIT);
        int bufferSize=Math.max(min*4,SAMPLE_RATE*CHANNELS*2/2);
        AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        AudioFormat fmt=new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build();
        return new AudioTrack(attrs,fmt,bufferSize,AudioTrack.MODE_STREAM,AudioManager.AUDIO_SESSION_ID_GENERATE);
    }

    private void startAudio(){
        synchronized(lock){audioTrack=makeTrack();playedBaseFrames=unsignedHead(audioTrack);}
        serviceRunning=true;
        renderThread=new Thread(()->{
            Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);
            while(serviceRunning){
                try{
                    synchronized(lock){
                        while(serviceRunning&&(!playing||!sidLoaded)) lock.wait(250);
                    }
                    if(!serviceRunning)break;
                    if(!playing||!sidLoaded)continue;

                    // If HVSC loop boundary is reached in render time, restart the
                    // emulator before producing the next PCM block.
                    if(loopEnabled&&loopLengthMs>0){
                        long renderMs=(renderedFrames*1000L)/SAMPLE_RATE;
                        if(renderMs>=loopLengthMs){
                            synchronized(lock){
                                try{NativeSid.nativeRestart();}catch(Throwable ignored){}
                                renderedFrames=0;
                            }
                        }
                    }

                    short[] pcm=NativeSid.nativeRender(2048);
                    if(pcm==null||pcm.length==0){Thread.sleep(5);continue;}
                    AudioTrack t;
                    synchronized(lock){t=audioTrack;}
                    if(t==null)continue;
                    int off=0;
                    while(serviceRunning&&playing&&off<pcm.length){
                        int n=t.write(pcm,off,pcm.length-off,AudioTrack.WRITE_BLOCKING);
                        if(n>0)off+=n; else if(n<0)break;
                    }
                    renderedFrames += pcm.length/2;
                }catch(InterruptedException e){break;}catch(Throwable ignored){}
            }
        },"Native-SID-reSIDfp");
        renderThread.start();
    }

    private void stopAudio(){
        serviceRunning=false;
        synchronized(lock){lock.notifyAll();}
        if(renderThread!=null)renderThread.interrupt();
        renderThread=null;
        synchronized(lock){
            if(audioTrack!=null){
                try{audioTrack.pause();}catch(Throwable ignored){}
                try{audioTrack.flush();}catch(Throwable ignored){}
                try{audioTrack.stop();}catch(Throwable ignored){}
                try{audioTrack.release();}catch(Throwable ignored){}
                audioTrack=null;
            }
            try{NativeSid.nativeUnload();}catch(Throwable ignored){}
        }
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){return START_STICKY;}
    @Override public void onDestroy(){
        stopAudio(); instance=null;
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Throwable ignored){}
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
