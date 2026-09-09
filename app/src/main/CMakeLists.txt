cmake_minimum_required(VERSION 3.22.1)
project(c64sidnative)

add_library(c64sidnative SHARED sidjni.cpp)

set(PREBUILT "${CMAKE_CURRENT_SOURCE_DIR}/prebuilt/${ANDROID_ABI}")
set(INCLUDE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/prebuilt/include")

add_library(sidplayfp STATIC IMPORTED)
set_target_properties(sidplayfp PROPERTIES IMPORTED_LOCATION "${PREBUILT}/libsidplayfp.a")

add_library(sidplayfp_residfp STATIC IMPORTED)
set_target_properties(sidplayfp_residfp PROPERTIES IMPORTED_LOCATION "${PREBUILT}/libsidplayfp-residfp.a")

add_library(residfp STATIC IMPORTED)
set_target_properties(residfp PROPERTIES IMPORTED_LOCATION "${PREBUILT}/libresidfp.a")

target_include_directories(c64sidnative PRIVATE
    "${INCLUDE_ROOT}"
    "${INCLUDE_ROOT}/sidplayfp"
)

find_library(log-lib log)
find_library(android-lib android)

target_compile_features(c64sidnative PRIVATE cxx_std_17)
target_compile_options(c64sidnative PRIVATE -O3 -fexceptions -frtti)

target_link_libraries(c64sidnative
    sidplayfp_residfp
    sidplayfp
    residfp
    ${android-lib}
    ${log-lib}
)
