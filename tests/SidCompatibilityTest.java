import com.example.c64sidplayersimple.SidCompatibility;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

public final class SidCompatibilityTest {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        check(SidCompatibility.forPlayback(null) == null, "null input");
        for (int size : new int[]{0, 123, 2990, 3468, 3023, 4201, 4453, 9360, 65536}) {
            byte[] unknown = new byte[size];
            check(SidCompatibility.forPlayback(unknown) == unknown, "unrecognized input changed");
            check(!SidCompatibility.usesFastBasicStartup(unknown), "unknown input accelerated");
        }
        // Optional real regression fixtures stay outside the repository.
        // Pass pairs of original SID and independently verified patched SID.
        check(args.length % 2 == 0, "expected original/patched fixture pairs");
        for (int i = 0; i < args.length; i += 2) {
            byte[] original = Files.readAllBytes(Path.of(args[i]));
            byte[] unchanged = original.clone();
            byte[] expected = Files.readAllBytes(Path.of(args[i + 1]));
            byte[] result = SidCompatibility.forPlayback(original);
            check(Arrays.equals(result, expected), "playback differs from verified patch");
            check(Arrays.equals(original, unchanged), "original/HVSC input mutated");
            check(SidCompatibility.forPlayback(result) == result, "patched twice");
            byte[] differentRevision = original.clone();
            differentRevision[differentRevision.length - 1] ^= 1;
            check(SidCompatibility.forPlayback(differentRevision) == differentRevision,
                    "unverified revision patched");
            System.out.println("Verified playback bytes: " + Path.of(args[i]).getFileName());
        }
        System.out.println("SID compatibility checks passed");
    }
}
