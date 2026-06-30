from PIL import Image
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public')


def remove_dark_bg(path: str, threshold: int = 40, feather: int = 18) -> None:
    img = Image.open(path).convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            lum = max(r, g, b)
            if lum <= threshold:
                px[x, y] = (r, g, b, 0)
            elif lum <= threshold + feather:
                alpha = int(255 * (lum - threshold) / feather)
                px[x, y] = (r, g, b, min(a, alpha))
    img.save(path, 'PNG')


def crop_to_square(img: Image.Image, pad_ratio: float = 0.08) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    side = max(w, h)
    pad = int(side * pad_ratio)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side // 2 + pad
    left = max(0, cx - half)
    top = max(0, cy - half)
    right = min(img.width, cx + half)
    bottom = min(img.height, cy + half)
    cropped = img.crop((left, top, right, bottom))
    side = max(cropped.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    ox = (side - cropped.width) // 2
    oy = (side - cropped.height) // 2
    square.paste(cropped, (ox, oy))
    return square


def main() -> None:
    logo = os.path.join(BASE, 'yeva-logo-horizontal.png')
    favicon = os.path.join(BASE, 'favicon.png')

    remove_dark_bg(logo)
    remove_dark_bg(favicon)

    icon = crop_to_square(Image.open(favicon).convert('RGBA'), pad_ratio=0.06)
    icon.save(favicon, 'PNG')
    icon.resize((32, 32), Image.Resampling.LANCZOS).save(
        os.path.join(BASE, 'favicon-32.png'), 'PNG'
    )
    icon.resize((180, 180), Image.Resampling.LANCZOS).save(
        os.path.join(BASE, 'apple-touch-icon.png'), 'PNG'
    )
    icon.resize((192, 192), Image.Resampling.LANCZOS).save(
        os.path.join(BASE, 'favicon-192.png'), 'PNG'
    )


if __name__ == '__main__':
    main()
