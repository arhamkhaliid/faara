from PIL import Image

def defringe_and_alpha(src_path, out_webp, out_png=None):
    im = Image.open(src_path).convert('RGB')
    w, h = im.size
    pixels = im.load()

    out_im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out_pixels = out_im.load()

    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            # Max difference from 255
            dr = 255 - r
            dg = 255 - g
            db = 255 - b
            max_diff = max(dr, dg, db)
            mean_c = (r + g + b) / 3.0

            # Background: pure white or near-white
            if max_diff <= 4 and mean_c >= 252:
                alpha = 0.0
                out_pixels[x, y] = (0, 0, 0, 0)
                continue

            # Falloff range between max_diff = 4 and max_diff = 55
            if max_diff < 55 and mean_c >= 210:
                alpha = (max_diff - 4.0) / 45.0
                alpha = max(0.0, min(1.0, alpha))
            else:
                alpha = 1.0

            if alpha <= 0.01:
                out_pixels[x, y] = (0, 0, 0, 0)
            elif alpha >= 0.99:
                out_pixels[x, y] = (r, g, b, 255)
            else:
                # True defringing: solve for C_fg
                safe_a = max(alpha, 0.10)
                cr = int(max(0, min(255, (r - 255.0 * (1.0 - alpha)) / safe_a)))
                cg = int(max(0, min(255, (g - 255.0 * (1.0 - alpha)) / safe_a)))
                cb = int(max(0, min(255, (b - 255.0 * (1.0 - alpha)) / safe_a)))
                a_byte = int(alpha * 255)
                out_pixels[x, y] = (cr, cg, cb, a_byte)

    # Crop with 16px padding
    bbox = out_im.getbbox()
    if bbox:
        cropped = out_im.crop(bbox)
        padded = Image.new('RGBA', (cropped.width + 32, cropped.height + 32), (0, 0, 0, 0))
        padded.paste(cropped, (16, 16))
        out_im = padded

    out_im.save(out_webp, 'WEBP', quality=95)
    if out_png:
        out_im.save(out_png, 'PNG')
    print(f"Defringed and saved: {out_webp} size: {out_im.size}")

if __name__ == '__main__':
    defringe_and_alpha(
        '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1/italian_cypress_1793312789006.jpg',
        'public/environment/italian_cypress.webp'
    )
    defringe_and_alpha(
        '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1/palace_garden_shrub_1793312806494.jpg',
        'public/environment/garden_shrub.webp'
    )

