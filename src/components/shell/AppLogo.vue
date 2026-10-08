<script setup lang="ts">
import { computed } from 'vue';
import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WIDTH,
  BRAND_MARK_HEIGHT,
  BRAND_MARK_SRC,
  BRAND_MARK_WIDTH,
} from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * BP Prime logo. Renders the official artwork at its true aspect ratio and
 * never recolours, crops or stretches it.
 *
 * `variant="full"` uses the horizontal lockup (gold mark + "BP PRIME"
 * wordmark). `variant="mark"` uses the diamond isolated from that same
 * asset, for widths where the wordmark cannot fit (collapsed sidebar).
 *
 * `plate` puts the logo on a white tile. The lockup has a transparent
 * background and a charcoal wordmark, so it needs a light backdrop to stay
 * legible against dark chrome.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'full' | 'mark';
    /** Rendered height in px. Width follows from the intrinsic ratio. */
    height?: number;
    plate?: boolean;
    class?: string;
  }>(),
  { variant: 'full', height: 24, plate: false },
);

const src = computed(() =>
  props.variant === 'mark' ? BRAND_MARK_SRC : BRAND_LOGO_SRC,
);
const intrinsicW = computed(() =>
  props.variant === 'mark' ? BRAND_MARK_WIDTH : BRAND_LOGO_WIDTH,
);
const intrinsicH = computed(() =>
  props.variant === 'mark' ? BRAND_MARK_HEIGHT : BRAND_LOGO_HEIGHT,
);

/* The width/height attributes give the browser the intrinsic ratio, so the
 * box is correct before the image decodes. `class` is merged here rather than
 * in the template because a bare `class` identifier is not valid there. */
const classes = computed(() =>
  cn(
    'block h-auto w-auto select-none',
    props.plate && 'brand-plate rounded-md p-1',
    props.class,
  ),
);
</script>

<template>
  <img
    :src="src"
    :alt="BRAND_LOGO_ALT"
    :width="intrinsicW"
    :height="intrinsicH"
    :class="classes"
    :style="{ height: `${height}px` }"
    decoding="async"
  />
</template>