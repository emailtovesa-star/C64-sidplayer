package com.example.c64sidplayersimple;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

/** Playback-only fixes for verified SID files. Never changes the source bytes. */
public final class SidCompatibility {
    private SidCompatibility() {}

    public static byte[] forPlayback(byte[] source) {
        // Match the complete original file, not a filename or composer. Already
        // patched files and other revisions must pass through unchanged.
        if (source == null || (source.length != 2990 && source.length != 3468)) return source;
        final String hash;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source);
            StringBuilder hex = new StringBuilder(64);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >>> 4) & 15, 16));
                hex.append(Character.forDigit(b & 15, 16));
            }
            hash = hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return source;
        }
        boolean dmc = hash.equals("6f240d33fa5ead6bd3a5a6f84d6cc19f1e921d25af3eed9a69d90e9f54239699");
        boolean fourth = hash.equals("b9b628138d64046239780ac489d99f5689eb26966bfd4f7722a5363667734ab5");
        if (!dmc && !fourth) return source;

        // Both verified PSID v2 files contain a little-endian load address at
        // offset 124. Their init routines use X; negative X disables playback.
        int load = (source[124] & 255) | ((source[125] & 255) << 8);
        int init = ((source[10] & 255) << 8) | (source[11] & 255);
        int wrapper = load + source.length - 126;
        byte[] playback = Arrays.copyOf(source, source.length + 5);
        playback[10] = (byte) (wrapper >>> 8);
        playback[11] = (byte) wrapper;
        int end = source.length;
        playback[end] = (byte) 0xa2;     // LDX #$00
        playback[end + 1] = 0;
        playback[end + 2] = 0x4c;      // JMP original init
        playback[end + 3] = (byte) init;
        playback[end + 4] = (byte) (init >>> 8);
        return playback;
    }
}
