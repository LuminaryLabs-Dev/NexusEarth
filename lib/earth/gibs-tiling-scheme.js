import { GeographicTilingScheme } from "cesium";

const MATRIX_WIDTHS = [2, 3, 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
const MATRIX_HEIGHTS = [1, 2, 3, 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560];

export class GibsGeographicTilingScheme extends GeographicTilingScheme {
  getNumberOfXTilesAtLevel(level) {
    return MATRIX_WIDTHS[level] ?? MATRIX_WIDTHS.at(-1) * 2 ** (level - MATRIX_WIDTHS.length + 1);
  }

  getNumberOfYTilesAtLevel(level) {
    return MATRIX_HEIGHTS[level] ?? MATRIX_HEIGHTS.at(-1) * 2 ** (level - MATRIX_HEIGHTS.length + 1);
  }
}

export { MATRIX_WIDTHS, MATRIX_HEIGHTS };
