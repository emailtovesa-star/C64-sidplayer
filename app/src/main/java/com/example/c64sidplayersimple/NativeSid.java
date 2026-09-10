package com.example.c64sidplayersimple;

public final class NativeSid {
    static {
        System.loadLibrary("c64sidnative");
    }
    private NativeSid() {}

    public static native boolean nativeLoad(byte[] sidBytes, int subsong);
    public static native boolean nativeRestart();
    public static native boolean nativeSetSidModel(int model);
    public static native short[] nativeRender(int frames);
    public static native void nativeUnload();
}
