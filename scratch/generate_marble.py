import math
import random
from PIL import Image, ImageDraw, ImageFilter

W, H = 2048, 2048
random.seed(2026)

# Base warm ivory and creamy-white Calacatta tone
base_color = (250, 246, 240)
im = Image.new('RGB', (W, H), base_color)

# 1. Multi-scale cloudy mineral depth (warm champagne and pale almond undertones)
cloud = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cloud_draw = ImageDraw.Draw(cloud)

for _ in range(140):
    x = random.uniform(0, W)
    y = random.uniform(0, H)
    rx = random.uniform(180, 480)
    ry = random.uniform(140, 380)
    tone = random.choice([
        (244, 234, 218, 55),  # warm pale champagne
        (255, 253, 248, 65),  # luminous creamy white
        (238, 227, 214, 45),  # faint greige
        (246, 238, 226, 50),  # creamy almond
    ])
    cloud_draw.ellipse([x - rx, y - ry, x + rx, y + ry], fill=tone)

cloud = cloud.filter(ImageFilter.GaussianBlur(radius=65))
im.paste(cloud, (0, 0), cloud)

# 2. Organic meandering vein ribbons with fractal displacement
vein_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
vein_draw = ImageDraw.Draw(vein_layer)

def generate_meandering_vein(x0, y0, target_angle, total_length, num_nodes=60):
    nodes = [(x0, y0)]
    cur_x, cur_y = x0, y0
    cur_angle = target_angle
    seg_len = total_length / num_nodes
    for i in range(num_nodes):
        cur_angle += math.sin(i * 0.35) * 0.18 + random.uniform(-0.16, 0.16)
        cur_x += math.cos(cur_angle) * seg_len
        cur_y += math.sin(cur_angle) * seg_len
        nodes.append((cur_x, cur_y))
    return nodes

# Primary diagonal flow angles (~35° to 55°)
primary_veins = []
for start_y in [-300, 200, 700, 1200, 1700, 2200]:
    start_x = random.uniform(-150, 350)
    angle = random.uniform(0.62, 0.80)
    primary_veins.append(generate_meandering_vein(start_x, start_y, angle, 3400, 75))

# Secondary flowing cross plumes
for start_x in [300, 900, 1500]:
    start_y = random.uniform(-150, 150)
    angle = random.uniform(0.85, 1.08)
    primary_veins.append(generate_meandering_vein(start_x, start_y, angle, 3000, 65))

# Pass A: Translucent sub-surface mineral plumes (pale beige & greige feathering)
for vein in primary_veins:
    for i in range(len(vein) - 1):
        p1, p2 = vein[i], vein[i+1]
        vein_draw.line([p1, p2], fill=(218, 202, 184, 40), width=random.randint(45, 80))

vein_layer = vein_layer.filter(ImageFilter.GaussianBlur(radius=28))
im.paste(vein_layer, (0, 0), vein_layer)

# Pass B: Mid-definition mineral trails (warm champagne & soft taupe-beige)
mid_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
mid_draw = ImageDraw.Draw(mid_layer)

for vein in primary_veins:
    for i in range(len(vein) - 1):
        p1, p2 = vein[i], vein[i+1]
        # Pale beige vein body
        mid_draw.line([p1, p2], fill=(205, 188, 168, 75), width=random.randint(14, 26))
        # Warm champagne gold highlight
        mid_draw.line([p1, p2], fill=(225, 200, 160, 90), width=random.randint(6, 14))

mid_layer = mid_layer.filter(ImageFilter.GaussianBlur(radius=9))
im.paste(mid_layer, (0, 0), mid_layer)

# Pass C: Fine crystalline fissures & delicate branching networks
fine_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fine_draw = ImageDraw.Draw(fine_layer)

for vein in primary_veins:
    for i in range(len(vein) - 1):
        p1, p2 = vein[i], vein[i+1]
        # Fine fissure in muted warm grey / greige
        fine_draw.line([p1, p2], fill=(178, 162, 148, 115), width=random.randint(2, 4))
        # Micro hairline in pale champagne gold
        fine_draw.line([p1, p2], fill=(208, 184, 150, 130), width=1)
        
    # Natural tributary branches
    branches = random.randint(5, 9)
    for _ in range(branches):
        idx = random.randint(3, len(vein) - 4)
        bx, by = vein[idx]
        b_angle = random.choice([-0.72, 0.72]) + random.uniform(-0.35, 0.35)
        b_nodes = generate_meandering_vein(bx, by, b_angle, random.uniform(200, 550), 25)
        for j in range(len(b_nodes) - 1):
            bp1, bp2 = b_nodes[j], b_nodes[j+1]
            fine_draw.line([bp1, bp2], fill=(198, 180, 162, 80), width=random.randint(2, 3))
            fine_draw.line([bp1, bp2], fill=(172, 156, 142, 95), width=1)

fine_layer = fine_layer.filter(ImageFilter.GaussianBlur(radius=1.5))
im.paste(fine_layer, (0, 0), fine_layer)

# 3. Large classical architectural slab seams (grand 2x2 marble terrace slabs)
joint_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
joint_draw = ImageDraw.Draw(joint_layer)

# Very soft 1px stone joints
joint_draw.line([(0, H // 2 - 1), (W, H // 2 - 1)], fill=(255, 255, 255, 60), width=1)
joint_draw.line([(0, H // 2), (W, H // 2)], fill=(175, 160, 145, 55), width=1)

joint_draw.line([(W // 2 - 1, 0), (W // 2 - 1, H)], fill=(255, 255, 255, 60), width=1)
joint_draw.line([(W // 2, 0), (W // 2, H)], fill=(175, 160, 145, 55), width=1)

joint_layer = joint_layer.filter(ImageFilter.GaussianBlur(radius=0.6))
im.paste(joint_layer, (0, 0), joint_layer)

out_path = '/Users/arhamkhalid/Documents/faara/public/environment/polished_ivory_marble.webp'
im.save(out_path, 'WEBP', quality=95)
print('Rich polished ivory marble generated successfully!')
