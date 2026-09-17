package com.example.c64sidplayersimple;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

/** Playback-only fixes for verified SID files. Never changes the source bytes. */
public final class SidCompatibility {
    private static final String GOD_SAVE_THE_KING_BASIC_SHA256 =
            "dc3fdc73975f848bb357d9555b5cb51c23eb3c1b590ee4ed24630348caca05cf";

    private SidCompatibility() {}

    /** Exact BASIC programs whose silent interpreter setup is safe to render ahead. */
    public static boolean usesFastBasicStartup(byte[] source) {
        return source != null && source.length == 5840 &&
                GOD_SAVE_THE_KING_BASIC_SHA256.equals(sha256(source));
    }

    private static String sha256(byte[] source) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source);
            StringBuilder hex = new StringBuilder(64);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >>> 4) & 15, 16));
                hex.append(Character.forDigit(b & 15, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return "";
        }
    }

    public static byte[] forPlayback(byte[] source) {
        // Match the complete original file, not a filename or composer. Already
        // patched files and other revisions must pass through unchanged.
        if (source == null || (source.length != 2990 && source.length != 3468 && source.length != 3023 && source.length != 4201 && source.length != 4453)) return source;
        final String hash=sha256(source);
        boolean dmc = hash.equals("6f240d33fa5ead6bd3a5a6f84d6cc19f1e921d25af3eed9a69d90e9f54239699");
        boolean fourth = hash.equals("b9b628138d64046239780ac489d99f5689eb26966bfd4f7722a5363667734ab5");
        boolean namnam = hash.equals("2f6241cd490caf9d5b963754df8f142a6d22b77298160187a805cdfaa7f5d062");
        boolean street = hash.equals("9f5338ff6c3597bd8fc5cf22e3da6b7da7af1bf761d7c35e7abcf67e03d66146");
        boolean dragon = hash.equals("9aaf7e588968baf2dc27941e60236278b75ad563e820749e87b61615e4c45350");
        // This exact Street Cred Boxing rip needs zero-filled trailing data.
        // Verified for both subtunes; keep the original for HVSC identification.
        if (street) return Arrays.copyOf(source, source.length + 3);
        if (!dmc && !fourth && !namnam && !dragon) return source;

        // These verified PSID v2 files contain a little-endian load address at
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
