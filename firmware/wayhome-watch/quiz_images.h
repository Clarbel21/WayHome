#pragma once

#include <lvgl.h>

// Game pictures (230x140 RGB565), made by firmware/tools/make_quiz_images.mjs
// from public/images/quiz-*.svg: places without name plaques (G1) and the
// three family faces (G2: Jamie, Sam, Mei — same order as initialFamily).
LV_IMAGE_DECLARE(wh_quiz_garden_img);
LV_IMAGE_DECLARE(wh_quiz_bakery_img);
LV_IMAGE_DECLARE(wh_quiz_library_img);
LV_IMAGE_DECLARE(wh_quiz_home_img);
LV_IMAGE_DECLARE(wh_quiz_face_jamie_img);
LV_IMAGE_DECLARE(wh_quiz_face_sam_img);
LV_IMAGE_DECLARE(wh_quiz_face_mei_img);
// G3 happy places: beach, park bench, old market, family kitchen.
LV_IMAGE_DECLARE(wh_quiz_place_beach_img);
LV_IMAGE_DECLARE(wh_quiz_place_bench_img);
LV_IMAGE_DECLARE(wh_quiz_place_market_img);
LV_IMAGE_DECLARE(wh_quiz_place_kitchen_img);
