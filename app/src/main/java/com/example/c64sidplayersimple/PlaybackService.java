package com.example.c64sidplayersimple;

import android.app.*;
import android.content.Intent;
import android.media.*;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.media.MediaMetadata;
import android.os.*;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class PlaybackService extends Service {
    private static final String CHANNEL="sid_playback_v422";
    private static final int ID=64, SAMPLE_RATE=44100, CHANNELS=2;
    private static final Object lock=new Object();
    private static final Object playlistLock=new Object();
    private static final ArrayList<NativeTrack> nativePlaylist=new ArrayList<>();
    private static int nativePlaylistIndex=-1;

    private static final class NativeTrack {
        final byte[] data;
        final int subsong;
        final String title;
        final String author;
        NativeTrack(byte[] data,int subsong,String title,String author){
            this.data=data;this.subsong=Math.max(0,subsong);
            this.title=(title==null||title.trim().isEmpty())?"C64 SID Player":title.trim();
            this.author=(author==null||author.trim().isEmpty())?"UNKNOWN":author.trim();
        }
    }

    private static final String ACTION_PREV="com.example.c64sidplayersimple.MEDIA_PREV";
    private static final String ACTION_TOGGLE="com.example.c64sidplayersimple.MEDIA_TOGGLE";
    private static final String ACTION_NEXT="com.example.c64sidplayersimple.MEDIA_NEXT";
    private static final String ACTION_STOP="com.example.c64sidplayersimple.MEDIA_STOP";

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
    private volatile boolean basicTune=false;
    private volatile long audibleStartRenderedFrames=0;
    private volatile long basicInitStartRenderedFrames=0;
    private volatile long basicLeadInFrames=0;
    private volatile boolean basicAudioArmed=false;
    private volatile long basicQuietFrames=0;

    private volatile String songTitle="C64 SID Player";
    private volatile String composer="UNKNOWN";
    private volatile long songDurationMs=0;
    private volatile int sidModel=6581;

    private PowerManager.WakeLock wakeLock;
    private final AtomicLong generation=new AtomicLong(1);
    private MediaSession mediaSession;

    private static long unsignedHead(AudioTrack t) {
        return ((long)t.getPlaybackHeadPosition()) & 0xffffffffL;
    }

    private static boolean isBasicTune(byte[] data) {
        return data!=null && data.length>=120 && data[0]=='R' && data[1]=='S' &&
            data[2]=='I' && data[3]=='D' && (data[119]&0x02)!=0;
    }

    private void resetTuneClock() {
        renderedFrames=0;
        basicLeadInFrames=0;
        basicInitStartRenderedFrames=0;
        audibleStartRenderedFrames=basicTune?-1:0;
        basicAudioArmed=!basicTune;
        basicQuietFrames=0;
    }

    private static boolean hasAudibleSamples(short[] pcm) {
        if(pcm==null)return false;
        for(short sample:pcm)if(Math.abs((int)sample)>128)return true;
        return false;
    }

    private void sendUiCommand(String cmd){
        try{ MainActivity.dispatchMediaCommand(cmd); }catch(Throwable ignored){}
    }

    public static void clearNativePlaylist(){
        synchronized(playlistLock){nativePlaylist.clear();nativePlaylistIndex=-1;}
    }

    public static void addNativePlaylistTrack(byte[] data,int subsong,String title,String author){
        if(data==null||data.length==0)return;
        synchronized(playlistLock){
            nativePlaylist.add(new NativeTrack(data.clone(),subsong,title,author));
        }
    }

    public static void setNativePlaylistIndex(int index,int subsong){
        synchronized(playlistLock){
            if(index>=0&&index<nativePlaylist.size()){
                NativeTrack old=nativePlaylist.get(index);
                nativePlaylist.set(index,new NativeTrack(old.data,subsong,old.title,old.author));
                nativePlaylistIndex=index;
            }
        }
    }

    private Integer skipNativeSong(int delta){
        final NativeTrack track;
        final int target;
        synchronized(playlistLock){
            if(nativePlaylist.isEmpty())return null;
            int base=nativePlaylistIndex;
            if(base<0||base>=nativePlaylist.size())base=0;
            target=(base+delta+nativePlaylist.size())%nativePlaylist.size();
            track=nativePlaylist.get(target);
        }
        synchronized(lock){
            generation.incrementAndGet();
            playing=false;
            try{if(audioTrack!=null){audioTrack.pause();audioTrack.flush();}}catch(Throwable ignored){}
            boolean ok;
            try{ok=NativeSid.nativeLoad(SidCompatibility.forPlayback(track.data),track.subsong);}catch(Throwable t){ok=false;}
            if(!ok)return null;
            sidLoaded=true;
            basicTune=isBasicTune(track.data);
            resetTuneClock();
            playedBaseFrames=audioTrack!=null?unsignedHead(audioTrack):0;
            songTitle=track.title;composer=track.author;songDurationMs=0;
            loopEnabled=false;loopLengthMs=0;
            playing=true;
            try{if(audioTrack!=null)audioTrack.play();}catch(Throwable ignored){}
            updateNotification();
            lock.notifyAll();
        }
        synchronized(playlistLock){nativePlaylistIndex=target;}
        return target;
    }

    private void skipAndSync(int delta,String fallback){
        Integer i=skipNativeSong(delta);
        sendUiCommand(i==null?fallback:"native:"+i);
    }

    public static void unloadSid() {
        synchronized(lock) {
            PlaybackService s=instance;
            if(s!=null){
                s.generation.incrementAndGet();s.playing=false;s.sidLoaded=false;
                try{if(s.audioTrack!=null){s.audioTrack.pause();s.audioTrack.flush();}}catch(Throwable ignored){}
                s.resetTuneClock();s.playedBaseFrames=s.audioTrack!=null?unsignedHead(s.audioTrack):0;
                s.updateNotification();
            }
            try{NativeSid.nativeUnload();}catch(Throwable ignored){}
        }
    }

    public static boolean loadSid(byte[] data,int subsong) {
        PlaybackService s=instance;
        if(s==null||data==null)return false;
        synchronized(lock) {
            s.generation.incrementAndGet();
            s.playing=false;
            try { if(s.audioTrack!=null){s.audioTrack.pause();s.audioTrack.flush();} } catch(Throwable ignored){}
            boolean ok;
            // Keep WebView/worker source bytes intact for canonical HVSC lookup.
            // Native restarts reuse this playback copy, including its init fix.
            try { ok=NativeSid.nativeLoad(SidCompatibility.forPlayback(data),subsong); } catch(Throwable t){ ok=false; }
            s.sidLoaded=ok;
            s.basicTune=isBasicTune(data);
            s.resetTuneClock();
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
            s.resetTuneClock();
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
                s.resetTuneClock();
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
            if(basicTune&&audibleStartRenderedFrames<0)return 0;
            long audibleFrames=basicTune?Math.max(0,frames-basicLeadInFrames):frames;
            long ms=(audibleFrames*1000L)/SAMPLE_RATE;
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
        startAudio();
    }

    private PendingIntent commandIntent(String action,int requestCode){
        Intent i=new Intent(this,PlaybackService.class).setAction(action);
        return PendingIntent.getService(this,requestCode,i,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }

    private void createMediaSession(){
        try{
            mediaSession=new MediaSession(this,"C64 SID Player");
            mediaSession.setCallback(new MediaSession.Callback(){
                @Override public void onSkipToPrevious(){ skipAndSync(-1,"prev"); }
                @Override public void onSkipToNext(){ skipAndSync(1,"next"); }
                @Override public void onPlay(){ sendUiCommand("toggle"); }
                @Override public void onPause(){ sendUiCommand("toggle"); }
                @Override public void onStop(){ sendUiCommand("stop"); }
            });
            mediaSession.setActive(true);
        }catch(Throwable ignored){mediaSession=null;}
    }

    private void createNotificationChannel(){
        NotificationManager nm=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"SID playback",NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("C64 SID playback and lock-screen controls");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(){
        Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open=PendingIntent.getActivity(this,0,launch,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        Notification.Action prev=new Notification.Action.Builder(
            android.R.drawable.ic_media_previous,"Previous",commandIntent(ACTION_PREV,1)).build();
        Notification.Action toggle=new Notification.Action.Builder(
            playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,
            playing?"Pause":"Play",commandIntent(ACTION_TOGGLE,2)).build();
        Notification.Action next=new Notification.Action.Builder(
            android.R.drawable.ic_media_next,"Next",commandIntent(ACTION_NEXT,3)).build();
        Notification.Action stop=new Notification.Action.Builder(
            android.R.drawable.ic_menu_close_clear_cancel,"Stop",commandIntent(ACTION_STOP,4)).build();

        Notification.Builder b=Build.VERSION.SDK_INT>=26
            ?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);

        b.setContentTitle(songTitle)
         .setContentText(composer)
         .setSubText("C64 SID Player")
         .setSmallIcon(playing?android.R.drawable.ic_media_play:android.R.drawable.ic_media_pause)
         .setContentIntent(open)
         .setOngoing(playing)
         .setOnlyAlertOnce(true)
         .setVisibility(Notification.VISIBILITY_PUBLIC)
         .setCategory(Notification.CATEGORY_TRANSPORT)
         .setShowWhen(false)
         .addAction(prev)
         .addAction(toggle)
         .addAction(next)
         .addAction(stop);

        if(Build.VERSION.SDK_INT>=21 && mediaSession!=null){
            b.setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0,1,2));
        }
        return b.build();
    }

    private void updateMediaSession(){
        if(mediaSession==null)return;
        try{
            MediaMetadata.Builder mb=new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE,songTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST,composer)
                .putString(MediaMetadata.METADATA_KEY_ALBUM,"C64 SID Player")
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE,songTitle)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE,composer)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_DESCRIPTION,"C64 SID Player");
            mediaSession.setMetadata(mb.build());

            int state=playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED;
            long actions=PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|
                PlaybackState.ACTION_PLAY_PAUSE|PlaybackState.ACTION_SKIP_TO_PREVIOUS|
                PlaybackState.ACTION_SKIP_TO_NEXT|PlaybackState.ACTION_STOP;
            mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setState(state,getPlayedMsLocked(),playing?1.0f:0.0f,SystemClock.elapsedRealtime())
                .setActions(actions)
                .build());
        }catch(Throwable ignored){}
    }

    private void updateNotification(){
        if(instance!=this)return;
        updateMediaSession();
        try{
            NotificationManager nm=getSystemService(NotificationManager.class);
            nm.notify(ID,buildNotification());
        }catch(Throwable ignored){}
    }

    private void handleCommand(String action){
        if(ACTION_PREV.equals(action)){
            skipAndSync(-1,"prev");return;
        }
        if(ACTION_NEXT.equals(action)){
            skipAndSync(1,"next");return;
        }
        if(ACTION_TOGGLE.equals(action)){sendUiCommand("toggle");return;}
        if(ACTION_STOP.equals(action)){sendUiCommand("stop");return;}
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

                    short[] pcm;
                    long renderGeneration;
                    synchronized(lock){
                        if(!serviceRunning||!playing||!sidLoaded)continue;
                        renderGeneration=generation.get();
                        if(loopEnabled&&loopLengthMs>0&&audibleStartRenderedFrames>=0){
                            long renderMs=((renderedFrames-audibleStartRenderedFrames)*1000L)/SAMPLE_RATE;
                            if(renderMs>=loopLengthMs){
                                try{NativeSid.nativeRestart();}catch(Throwable ignored){}
                                basicInitStartRenderedFrames=renderedFrames;
                                audibleStartRenderedFrames=basicTune?-1:renderedFrames;
                                basicAudioArmed=!basicTune;
                                basicQuietFrames=0;
                            }
                        }
                        // libsidplayfp engine access must never overlap unload/reload.
                        pcm=NativeSid.nativeRender(2048);
                        if(basicTune&&audibleStartRenderedFrames<0){
                            final boolean audible=hasAudibleSamples(pcm);
                            final long pcmFrames=pcm==null?0:pcm.length/2;
                            if(!basicAudioArmed){
                                if(audible)basicQuietFrames=0;
                                else if((basicQuietFrames+=pcmFrames)>=SAMPLE_RATE/2)basicAudioArmed=true;
                            }else if(audible){
                                audibleStartRenderedFrames=renderedFrames;
                                basicLeadInFrames+=Math.max(0,renderedFrames-basicInitStartRenderedFrames);
                            }
                        }
                    }
                    if(pcm==null||pcm.length==0){Thread.sleep(5);continue;}
                    if(renderGeneration!=generation.get())continue;
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

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&intent.getAction()!=null)handleCommand(intent.getAction());
        return START_STICKY;
    }

    @Override public void onDestroy(){
        stopAudio();instance=null;
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Throwable ignored){}
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
