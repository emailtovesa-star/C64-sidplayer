package com.example.c64sidplayersimple;

import android.app.*;
import android.content.Intent;
import android.media.*;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.media.MediaMetadata;
import android.os.*;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

public class PlaybackService extends Service {
    private static final String CHANNEL="sid_playback_v420";
    private static final int ID=64, SAMPLE_RATE=44100, CHANNELS=2;
    private static final Object lock=new Object();

    private static PlaybackService instance;
    private AudioTrack audioTrack;
    private Thread renderThread;
    private volatile boolean serviceRunning=false;
    private volatile boolean playing=false;
    private volatile boolean sidLoaded=false;
    private volatile boolean loopEnabled=false;
    private volatile long loopLengthMs=0;
    private volatile long renderedFrames=0;
    private volatile long playedBaseFrames=0;

    private volatile String songTitle="C64 SID Player";
    private volatile String composer="UNKNOWN";
    private volatile long songDurationMs=0;
    private volatile int sidModel=6581;

    private PowerManager.WakeLock wakeLock;
    private final AtomicLong generation=new AtomicLong(1);
    private MediaSession mediaSession;
    private Handler notificationHandler;
    private final Runnable notificationTicker=new Runnable(){
        @Override public void run(){
            try{ updateNotification(); }catch(Throwable ignored){}
            if(notificationHandler!=null) notificationHandler.postDelayed(this,1000);
        }
    };

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
            s.updateNotification();
            return ok;
        }
    }

    public static void playNative() {
        PlaybackService s=instance;if(s==null||!s.sidLoaded)return;
        synchronized(lock){
            try{if(s.audioTrack!=null)s.audioTrack.play();}catch(Throwable ignored){}
            s.playing=true;
            s.updateNotification();
            lock.notifyAll();
        }
    }

    public static void pauseNative() {
        PlaybackService s=instance;if(s==null)return;
        synchronized(lock){
            s.playing=false;
            try{if(s.audioTrack!=null)s.audioTrack.pause();}catch(Throwable ignored){}
            s.updateNotification();
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
            s.updateNotification();
            lock.notifyAll();
        }
    }

    public static boolean setSidModel(int model) {
        int wanted=(model==8580)?8580:6581;
        PlaybackService s=instance;
        if(s==null){
            try{return NativeSid.nativeSetSidModel(wanted);}catch(Throwable ignored){return false;}
        }
        synchronized(lock){
            boolean wasPlaying=s.playing;
            s.generation.incrementAndGet();
            try{
                if(s.audioTrack!=null){s.audioTrack.pause();s.audioTrack.flush();}
            }catch(Throwable ignored){}

            boolean ok;
            try{ok=NativeSid.nativeSetSidModel(wanted);}catch(Throwable t){ok=false;}
            s.sidModel=wanted;

            if(ok && s.sidLoaded){
                try{ok=NativeSid.nativeRestart();}catch(Throwable t){ok=false;}
                s.renderedFrames=0;
                s.playedBaseFrames=s.audioTrack!=null?unsignedHead(s.audioTrack):0;
            }

            s.playing=wasPlaying && s.sidLoaded && ok;
            try{if(s.audioTrack!=null && s.playing)s.audioTrack.play();}catch(Throwable ignored){}
            s.updateNotification();
            lock.notifyAll();
            return ok;
        }
    }

    public static void setNowPlaying(String title,String author,long durationMs,int model){
        PlaybackService s=instance;if(s==null)return;
        synchronized(lock){
            s.songTitle=(title==null||title.trim().isEmpty())?"C64 SID Player":title.trim();
            s.composer=(author==null||author.trim().isEmpty())?"UNKNOWN":author.trim();
            s.songDurationMs=Math.max(0,durationMs);
            s.sidModel=(model==8580)?8580:6581;
            s.updateNotification();
        }
    }

    public static void setLoop(boolean enabled,long durationMs) {
        PlaybackService s=instance;if(s==null)return;
        s.loopEnabled=enabled;
        s.loopLengthMs=Math.max(0,durationMs);
        if(durationMs>0)s.songDurationMs=durationMs;
        s.updateNotification();
    }

    public static long getPlayedMs() {
        PlaybackService s=instance;if(s==null||s.audioTrack==null)return 0;
        synchronized(lock){return s.getPlayedMsLocked();}
    }

    private long getPlayedMsLocked(){
        if(audioTrack==null)return 0;
        try{
            long now=unsignedHead(audioTrack);
            long frames=(now-playedBaseFrames)&0xffffffffL;
            long ms=(frames*1000L)/SAMPLE_RATE;
            if(loopEnabled&&loopLengthMs>0)ms%=loopLengthMs;
            if(!loopEnabled&&songDurationMs>0)ms=Math.min(ms,songDurationMs);
            return Math.max(0,ms);
        }catch(Throwable ignored){return 0;}
    }

    public static int getBufferedMs(){return 0;}

    @Override public void onCreate(){
        super.onCreate();instance=this;
        try{
            PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
            wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,getPackageName()+":NativeSID");
            wakeLock.setReferenceCounted(false);wakeLock.acquire();
        }catch(Throwable ignored){}
        createMediaSession();
        createNotificationChannel();
        startForeground(ID,buildNotification());
        notificationHandler=new Handler(Looper.getMainLooper());
        notificationHandler.post(notificationTicker);
        startAudio();
    }

    private void createMediaSession(){
        try{
            mediaSession=new MediaSession(this,"C64 SID Player");
            mediaSession.setActive(true);
        }catch(Throwable ignored){mediaSession=null;}
    }

    private void createNotificationChannel(){
        NotificationManager nm=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"SID playback",NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("C64 SID playback and lock-screen information");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    private String fmt(long ms){
        long total=Math.max(0,ms/1000L);
        return String.format(Locale.US,"%d:%02d",total/60,total%60);
    }

    private String compactInfo(long pos){
        String time=fmt(pos)+" / "+(songDurationMs>0?fmt(songDurationMs):"--:--");
        return composer+" • SID "+sidModel+" • "+time;
    }

    private Notification buildNotification(){
        long pos;
        synchronized(lock){pos=getPlayedMsLocked();}
        Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi=PendingIntent.getActivity(this,0,launch,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b=Build.VERSION.SDK_INT>=26
            ?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);

        b.setContentTitle(songTitle)
         .setContentText(compactInfo(pos))
         .setSubText("C64 SID Player")
         .setSmallIcon(playing?android.R.drawable.ic_media_play:android.R.drawable.ic_media_pause)
         .setContentIntent(pi)
         .setOngoing(playing)
         .setOnlyAlertOnce(true)
         .setVisibility(Notification.VISIBILITY_PUBLIC)
         .setCategory(Notification.CATEGORY_TRANSPORT)
         .setShowWhen(false);

        if(Build.VERSION.SDK_INT>=21 && mediaSession!=null){
            b.setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()));
        }
        return b.build();
    }

    private void updateMediaSession(long pos){
        if(mediaSession==null)return;
        try{
            String line=compactInfo(pos);

            MediaMetadata.Builder mb=new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE,songTitle)
                // Many Android lock screens show ARTIST as the one compact subtitle line.
                .putString(MediaMetadata.METADATA_KEY_ARTIST,line)
                .putString(MediaMetadata.METADATA_KEY_ALBUM,"C64 SID Player")
                // OEM lock screens may prefer DISPLAY_* keys over TITLE/ARTIST.
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE,songTitle)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE,line)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_DESCRIPTION,"C64 SID Player");
            if(songDurationMs>0)mb.putLong(MediaMetadata.METADATA_KEY_DURATION,songDurationMs);
            mediaSession.setMetadata(mb.build());

            int state=playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED;
            mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setState(state,pos,playing?1.0f:0.0f,SystemClock.elapsedRealtime())
                .setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_PLAY_PAUSE)
                .build());
        }catch(Throwable ignored){}
    }

    private void updateNotification(){
        if(instance!=this)return;
        long pos;
        synchronized(lock){pos=getPlayedMsLocked();}
        updateMediaSession(pos);
        try{
            NotificationManager nm=getSystemService(NotificationManager.class);
            nm.notify(ID,buildNotification());
        }catch(Throwable ignored){}
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
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);
            while(serviceRunning){
                try{
                    synchronized(lock){
                        while(serviceRunning&&(!playing||!sidLoaded))lock.wait(250);
                    }
                    if(!serviceRunning)break;
                    if(!playing||!sidLoaded)continue;

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
                        if(n>0)off+=n;else if(n<0)break;
                    }
                    renderedFrames+=pcm.length/2;
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
        if(notificationHandler!=null){
            notificationHandler.removeCallbacks(notificationTicker);
            notificationHandler=null;
        }
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
        if(mediaSession!=null){
            try{mediaSession.setActive(false);mediaSession.release();}catch(Throwable ignored){}
            mediaSession=null;
        }
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){return START_STICKY;}
    @Override public void onDestroy(){
        stopAudio();instance=null;
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Throwable ignored){}
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
