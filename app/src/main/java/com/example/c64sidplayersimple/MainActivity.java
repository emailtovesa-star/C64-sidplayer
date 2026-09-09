package com.example.c64sidplayersimple;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public class MainActivity extends Activity {
    private static final int PICK = 1001;
    private WebView web;
    private ValueCallback<Uri[]> callback;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this); setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true); s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new AndroidBridge(), "AndroidPlayer");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();

        web.setWebViewClient(new WebViewClientCompat() {
            @Nullable @Override public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Nullable @Override @SuppressWarnings("deprecation")
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView,
                    ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
                if (callback != null) callback.onReceiveValue(null);
                callback = filePathCallback;
                web.evaluateJavascript("window.onNativeFilePickerOpening&&window.onNativeFilePickerOpening()", null);
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(i, PICK); return true;
            }
        });
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    public class AndroidBridge {
        @JavascriptInterface public void startPlaybackService() {
            ContextCompat.startForegroundService(MainActivity.this,
                    new Intent(MainActivity.this, PlaybackService.class));
        }
        @JavascriptInterface public void stopPlaybackService() {
            stopService(new Intent(MainActivity.this, PlaybackService.class));
        }
        @JavascriptInterface public void enqueuePcm(String base64Pcm) {
            PlaybackService.enqueueBase64(base64Pcm);
        }
        @JavascriptInterface public void resetAudioOutput() { PlaybackService.resetOutput(); }
        @JavascriptInterface public void clearPcm() { PlaybackService.clearQueue(); }
        @JavascriptInterface public void pauseAudioOutput() { PlaybackService.pauseOutput(); }
        @JavascriptInterface public void resumeAudioOutput() { PlaybackService.resumeOutput(); }
        @JavascriptInterface public int bufferedMs() { return PlaybackService.getBufferedMs(); }
        @JavascriptInterface public long playedMs() { return PlaybackService.getPlayedMs(); }
    }

    @Override protected void onPause() {
        super.onPause();
        if (web != null) web.evaluateJavascript(
            "window.onAndroidBackground&&window.onAndroidBackground()", null);
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript(
            "window.onAndroidForeground&&window.onAndroidForeground()", null);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK || callback == null) return;
        Uri[] resultUris = null;
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n=data.getClipData().getItemCount(); resultUris=new Uri[n];
                for(int x=0;x<n;x++) resultUris[x]=data.getClipData().getItemAt(x).getUri();
            } else if (data.getData()!=null) resultUris=new Uri[]{data.getData()};
        }
        callback.onReceiveValue(resultUris); callback=null;
        web.postDelayed(() -> web.evaluateJavascript(
            "window.onNativeFilePickerClosed&&window.onNativeFilePickerClosed()", null),150);
    }
    @Override protected void onDestroy() {
        if(web!=null){web.loadUrl("about:blank");web.destroy();}
        super.onDestroy();
    }
}
