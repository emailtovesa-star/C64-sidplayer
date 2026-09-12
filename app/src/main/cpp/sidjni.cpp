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
static int gSubsong=0;
static int gSidModel=6581;
static bool gDigiBoost=false;
static bool rebuildLocked(){
 if(gSidBytes.empty())return false;
 try{
  gTune.reset();gPlayer.reset();gBuilder.reset();
  gPlayer=std::make_unique<sidplayfp>();
  gBuilder=std::make_unique<ReSIDfpBuilder>("reSIDfp Android");
  gBuilder->create(gPlayer->info().maxsids());if(!gBuilder->getStatus())return false;
  gTune=std::make_unique<SidTune>(gSidBytes.data(),(uint_least32_t)gSidBytes.size());if(!gTune->getStatus())return false;
  const SidTuneInfo* info=gTune->getInfo();unsigned songs=info?info->songs():1;
  unsigned selected=(unsigned)std::max(0,gSubsong)+1;if(selected>songs)selected=songs;gTune->selectSong(selected);
  SidConfig cfg=gPlayer->config();cfg.frequency=44100;cfg.playback=SidConfig::STEREO;cfg.sidEmulation=gBuilder.get();
  cfg.defaultSidModel=(gSidModel==8580)?SidConfig::MOS8580:SidConfig::MOS6581;cfg.forceSidModel=true;
  cfg.digiBoost=(gSidModel==8580)&&gDigiBoost;
  cfg.defaultC64Model=SidConfig::PAL;cfg.forceC64Model=false;cfg.samplingMethod=SidConfig::RESAMPLE_INTERPOLATE;
  if(!gPlayer->config(cfg))return false;if(!gPlayer->load(gTune.get()))return false;return true;
 }catch(...){return false;}
}
extern "C" JNIEXPORT jboolean JNICALL Java_com_example_c64sidplayersimple_NativeSid_nativeLoad(JNIEnv*e,jclass,jbyteArray d,jint s){
 if(!d)return JNI_FALSE;jsize n=e->GetArrayLength(d);if(n<=0)return JNI_FALSE;std::vector<uint8_t>b((size_t)n);e->GetByteArrayRegion(d,0,n,reinterpret_cast<jbyte*>(b.data()));
 std::lock_guard<std::mutex>l(gMutex);gSidBytes=std::move(b);gSubsong=(int)s;return rebuildLocked()?JNI_TRUE:JNI_FALSE;}
extern "C" JNIEXPORT jboolean JNICALL Java_com_example_c64sidplayersimple_NativeSid_nativeRestart(JNIEnv*,jclass){std::lock_guard<std::mutex>l(gMutex);return rebuildLocked()?JNI_TRUE:JNI_FALSE;}
extern "C" JNIEXPORT jboolean JNICALL Java_com_example_c64sidplayersimple_NativeSid_nativeSetSidModel(JNIEnv*,jclass,jint model){
 std::lock_guard<std::mutex>l(gMutex);int wanted=(model==8580)?8580:6581;
 if(wanted==8580&&gSidModel==8580)gDigiBoost=!gDigiBoost;
 else{gSidModel=wanted;gDigiBoost=false;}return JNI_TRUE;}
extern "C" JNIEXPORT jshortArray JNICALL Java_com_example_c64sidplayersimple_NativeSid_nativeRender(JNIEnv*e,jclass,jint f){
 if(f<64)f=64;if(f>16384)f=16384;std::vector<short>pcm((size_t)f*2);uint_least32_t w=0;{std::lock_guard<std::mutex>l(gMutex);if(!gPlayer)return e->NewShortArray(0);try{w=gPlayer->play(pcm.data(),(uint_least32_t)pcm.size());}catch(...){w=0;}}
 if(w>pcm.size())w=(uint_least32_t)pcm.size();jshortArray o=e->NewShortArray((jsize)w);if(o&&w)e->SetShortArrayRegion(o,0,(jsize)w,reinterpret_cast<const jshort*>(pcm.data()));return o;}
extern "C" JNIEXPORT void JNICALL Java_com_example_c64sidplayersimple_NativeSid_nativeUnload(JNIEnv*,jclass){std::lock_guard<std::mutex>l(gMutex);gTune.reset();gPlayer.reset();gBuilder.reset();gSidBytes.clear();}
