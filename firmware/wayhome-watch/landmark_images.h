#pragma once

#include <lvgl.h>

#include "watch_state.h"

// Built-in landmark photos from public/images, converted to 360x200 RGB565 by
// firmware/tools/make_landmark_images.mjs. Index = the current stop number
// sent in watch_state byte2, matching initialLandmarks in src/store.ts.
constexpr uint8_t WH_LANDMARK_COUNT = BUILTIN_LANDMARK_COUNT;

LV_IMAGE_DECLARE(wh_garden_img);
LV_IMAGE_DECLARE(wh_bakery_img);
LV_IMAGE_DECLARE(wh_library_img);
LV_IMAGE_DECLARE(wh_home_img);

struct LandmarkImage {
  const char *name;
  const lv_image_dsc_t *image;
};

extern const LandmarkImage whLandmarkImages[WH_LANDMARK_COUNT];
