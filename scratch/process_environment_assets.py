import sys
from PIL import Image

def process_image(src_path, out_webp, out_png=None):
    im = Image.open(src_path).convert('RGB')
    width, height = im.size
    pixels = im.load()

    # Create RGBA image
    out_im = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    out_pixels = out_im.load()

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            min_c = min(r, g, b)
            mean_c = (r + g + b) / 3.0
            max_diff = max(abs(r - 255), abs(g - 255), abs(b - 255))

            # If it's near pure white background:
            if min_c >= 253 and max_diff <= 4:
                alpha = 0.0
            elif min_c >= 242 and mean_c >= 246 and max_diff <= 12:
                # Soft edge feather
                alpha = (254.0 - min_c) / 14.0
                alpha = max(0.0, min(1.0, alpha))
            else:
                alpha = 1.0

            if alpha <= 0.0:
                out_pixels[x, y] = (0, 0, 0, 0)
            elif alpha >= 1.0:
                out_pixels[x, y] = (r, g, b, 255)
            else:
                # Defringe slightly to remove white halo
                safe_a = max(alpha, 0.08)
                dr = int(max(0, min(255, (r - 255 * (1.0 - alpha)) / safe_a)))
                dg = int(max(0, min(255, (g - 255 * (1.0 - alpha)) / safe_a)))
                db = int(max(0, min(255, (b - 255 * (1.0 - alpha)) / safe_a)))
                out_pixels[x, y] = (dr, dg, db, int(alpha * 255))

    # Crop to content with small 12px padding
    bbox = out_im.getbbox()
    if bbox:
        cropped = out_im.crop(bbox)
        padded = Image.new('RGBA', (cropped.width + 24, cropped.height + 24), (0, 0, 0, 0))
        padded.paste(cropped, (12, 12))
        out_im = padded

    out_im.save(out_webp, 'WEBP', quality=95)
    if out_png:
        out_im.save(out_png, 'PNG')
    print(f"Processed {src_path} -> {out_webp} size: {out_im.size}")

if __name__ == '__main__':
    if len(sys.argv) >= 3:
        src = sys.argv[1]
        out_webp = sys.argv[2]
        out_png = sys.argv[3] if len(sys.argv) >= 4 else None
        process_image(src, out_webp, out_png)
