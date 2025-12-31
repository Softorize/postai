#!/usr/bin/env python3
"""Generate PostAI app icons and DMG background."""

import os
import shutil
from PIL import Image, ImageDraw, ImageFont

# Ensure resources directory exists
os.makedirs('resources', exist_ok=True)

def create_gradient(size, color1, color2):
    """Create a vertical gradient image."""
    img = Image.new('RGBA', (size, size))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        ratio = y / size
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    return img

def create_rounded_rect_mask(size, radius):
    """Create a rounded rectangle mask."""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=255)
    return mask

def create_app_icon(size):
    """Create the PostAI app icon at a given size."""
    # Primary gradient colors (purple to blue)
    color1 = (139, 92, 246)   # Purple-500
    color2 = (59, 130, 246)   # Blue-500

    # Create gradient background
    img = create_gradient(size, color1, color2)

    # Apply rounded corners (22.37% radius for macOS Big Sur style)
    radius = int(size * 0.2237)
    mask = create_rounded_rect_mask(size, radius)

    # Create output with transparency
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, mask=mask)

    # Draw the "P" letter
    draw = ImageDraw.Draw(output)

    # Try to use a nice font, fall back to default
    font_size = int(size * 0.6)
    try:
        # Try SF Pro or Helvetica
        for font_name in ['/System/Library/Fonts/SFNS.ttf',
                          '/System/Library/Fonts/SFNSDisplay.ttf',
                          '/System/Library/Fonts/Helvetica.ttc',
                          '/Library/Fonts/Arial Bold.ttf']:
            if os.path.exists(font_name):
                font = ImageFont.truetype(font_name, font_size)
                break
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Get text bounding box for centering
    text = "P"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1] - int(size * 0.02)  # Slight adjustment

    # Draw white text with slight shadow for depth
    shadow_offset = max(1, size // 128)
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 50))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    return output

def create_dmg_background():
    """Create the DMG background image."""
    width, height = 540, 380

    # Create gradient background (dark)
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)

    # Dark gradient from top to bottom
    color1 = (30, 30, 40)
    color2 = (20, 20, 30)

    for y in range(height):
        ratio = y / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Add subtle pattern/texture
    for x in range(0, width, 20):
        for y in range(0, height, 20):
            if (x + y) % 40 == 0:
                draw.ellipse([x-1, y-1, x+1, y+1], fill=(40, 40, 50))

    # Add app name at top
    try:
        for font_path in ['/System/Library/Fonts/SFNS.ttf',
                          '/System/Library/Fonts/Helvetica.ttc']:
            if os.path.exists(font_path):
                title_font = ImageFont.truetype(font_path, 28)
                break
        else:
            title_font = ImageFont.load_default()
    except:
        title_font = ImageFont.load_default()

    title = "PostAI"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    draw.text(((width - title_width) // 2, 30), title, font=title_font, fill=(255, 255, 255))

    # Add instruction text
    try:
        for font_path in ['/System/Library/Fonts/SFNS.ttf',
                          '/System/Library/Fonts/Helvetica.ttc']:
            if os.path.exists(font_path):
                small_font = ImageFont.truetype(font_path, 14)
                break
        else:
            small_font = ImageFont.load_default()
    except:
        small_font = ImageFont.load_default()

    instruction = "Drag to Applications to install"
    bbox = draw.textbbox((0, 0), instruction, font=small_font)
    inst_width = bbox[2] - bbox[0]
    draw.text(((width - inst_width) // 2, height - 40), instruction, font=small_font, fill=(150, 150, 150))

    # Draw arrow from left icon position to right
    arrow_y = 220
    arrow_start = 180
    arrow_end = 360

    # Arrow line
    draw.line([(arrow_start, arrow_y), (arrow_end, arrow_y)], fill=(100, 100, 120), width=2)
    # Arrow head
    draw.polygon([(arrow_end, arrow_y), (arrow_end - 10, arrow_y - 6), (arrow_end - 10, arrow_y + 6)], fill=(100, 100, 120))

    return img

def main():
    print("Generating PostAI icons...")

    # Create iconset directory
    iconset_path = 'resources/icon.iconset'
    if os.path.exists(iconset_path):
        shutil.rmtree(iconset_path)
    os.makedirs(iconset_path)

    # Generate icons at all required sizes
    sizes = [16, 32, 64, 128, 256, 512, 1024]

    for size in sizes:
        print(f"  Creating {size}x{size} icon...")
        icon = create_app_icon(size)

        # Save regular size
        icon.save(f'{iconset_path}/icon_{size}x{size}.png')

        # Save @2x version (except for 1024)
        if size <= 512:
            icon_2x = create_app_icon(size * 2)
            icon_2x.save(f'{iconset_path}/icon_{size}x{size}@2x.png')

    print("Converting to .icns...")
    os.system(f'iconutil -c icns {iconset_path} -o resources/icon.icns')

    # Clean up iconset
    shutil.rmtree(iconset_path)

    print("Creating DMG background...")
    dmg_bg = create_dmg_background()
    dmg_bg.save('resources/dmg-background.png')

    # Also create a simple PNG icon for other uses
    print("Creating PNG icon...")
    icon_512 = create_app_icon(512)
    icon_512.save('resources/icon.png')

    print("Done! Generated files:")
    print("  - resources/icon.icns")
    print("  - resources/icon.png")
    print("  - resources/dmg-background.png")

if __name__ == '__main__':
    main()
