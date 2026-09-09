#include <jni.h>
#include <vector>
#include <memory>
#include <mutex>
#include <algorithm>
#include <cstring>

#include <sidplayfp/sidplayfp.h>
#include <sidplayfp/SidInfo.h>
#include <sidplayfp/SidTune.h>
#include <sidplayfp/SidTuneInfo.h>
#include <sidplayfp/SidConfig.h>
#include <sidplayfp/builders/residfp.h>

static std::mutex gMutex;
static std::unique_ptr<sidplayfp> gPlayer;
static std::unique_ptr<ReSIDfpBuilder> gBuilder;
static std::unique_ptr<SidTune> gTune;
static std::vector<uint8_t> gSidBytes;
static int gSubsong = 0;

static bool rebuildLocked() {
    if (gSidBytes.empty()) return false;
    try {
        gTune.reset();
        gPlayer.reset();
        gBuilder.reset();

        gPlayer = std::make_unique<sidplayfp>();
        gBuilder = std::make_unique<ReSIDfpBuilder>("reSIDfp Android");
        gBuilder->create(gPlayer->info().maxsids());
        if (!gBuilder->getStatus()) return false;

        gTune = std::make_unique<SidTune>(gSidBytes.data(), (uint_least32_t)gSidBytes.size());
        if (!gTune->getStatus()) return false;

        const SidTuneInfo* info = gTune->getInfo();
        unsigned songs = info ? info->songs() : 1;
        unsigned selected = (unsigned)std::max(0, gSubsong) + 1;
        if (selected > songs) selected = songs;
        gTune->selectSong(selected);

        SidConfig cfg = gPlayer->config();
        cfg.frequency = 44100;
        cfg.playback = SidConfig::STEREO;
        cfg.sidEmulation = gBuilder.get();
        cfg.defaultSidModel = SidConfig::MOS6581;
        cfg.forceSidModel = false;
        cfg.defaultC64Model = SidConfig::PAL;
        cfg.forceC64Model = false;
        cfg.samplingMethod = SidConfig::RESAMPLE_INTERPOLATE;

        if (!gPlayer->config(cfg)) return false;
        if (!gPlayer->load(gTune.get())) return false;
        return true;
    } catch (...) {
        return false;
    }
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_example_c64sidplayersimple_NativeSid_nativeLoad(
        JNIEnv* env, jclass, jbyteArray data, jint subsong) {
    if (!data) return JNI_FALSE;
    jsize n = env->GetArrayLength(data);
    if (n <= 0) return JNI_FALSE;
    std::vector<uint8_t> bytes((size_t)n);
    env->GetByteArrayRegion(data, 0, n, reinterpret_cast<jbyte*>(bytes.data()));

    std::lock_guard<std::mutex> lock(gMutex);
    gSidBytes = std::move(bytes);
    gSubsong = (int)subsong;
    return rebuildLocked() ? JNI_TRUE : JNI_FALSE;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_example_c64sidplayersimple_NativeSid_nativeRestart(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lock(gMutex);
    return rebuildLocked() ? JNI_TRUE : JNI_FALSE;
}

extern "C"
JNIEXPORT jshortArray JNICALL
Java_com_example_c64sidplayersimple_NativeSid_nativeRender(
        JNIEnv* env, jclass, jint frames) {
    if (frames < 64) frames = 64;
    if (frames > 16384) frames = 16384;

    std::vector<short> pcm((size_t)frames * 2);
    uint_least32_t written = 0;

    {
        std::lock_guard<std::mutex> lock(gMutex);
        if (!gPlayer) return env->NewShortArray(0);
        try {
            written = gPlayer->play(pcm.data(), (uint_least32_t)pcm.size());
        } catch (...) {
            written = 0;
        }
    }

    if (written > pcm.size()) written = (uint_least32_t)pcm.size();
    jshortArray out = env->NewShortArray((jsize)written);
    if (out && written) {
        env->SetShortArrayRegion(out, 0, (jsize)written,
                                 reinterpret_cast<const jshort*>(pcm.data()));
    }
    return out;
}

extern "C"
JNIEXPORT void JNICALL
Java_com_example_c64sidplayersimple_NativeSid_nativeUnload(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lock(gMutex);
    gTune.reset();
    gPlayer.reset();
    gBuilder.reset();
    gSidBytes.clear();
}
