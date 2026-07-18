from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
BULLET = " \u2022 "
TEXT_LINES = [
    "AI & ONDERWIJS",
    "ATLAS NEDERLAND",
    "Vind wat er al bestaat.",
    "Voor AI in het onderwijs.",
    BULLET.join(["Handreikingen", "trainingen", "voorzieningen", "subsidies"]),
    BULLET.join(["praktijkvoorbeelden", "wetgeving", "organisaties"]),
    BULLET.join(["OPEN", "BRONGEBASEERD", "GEEN TRACKING"]),
    "Eva Willems",
]


def generate(output: Path) -> None:
    if any("?" in line for line in TEXT_LINES):
        raise ValueError("Een onverwacht vraagteken staat in de social-previewtekst.")
    image = Image.new("RGB", (WIDTH, HEIGHT), "#fcfaf6")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 16), fill="#6f7651")
    draw.polygon([(0, 500), (420, 452), (760, 488), (1200, 430), (1200, 630), (0, 630)], fill="#e8eef0")
    draw.polygon([(0, 555), (360, 510), (760, 558), (1200, 505), (1200, 630), (0, 630)], fill="#e8dfcf")
    draw.polygon([(0, 600), (400, 565), (800, 603), (1200, 555), (1200, 630), (0, 630)], fill="#6f7651")
    fonts = Path("C:/Windows/Fonts")
    font = lambda name, size: ImageFont.truetype(str(fonts / name), size)
    regular = font("segoeui.ttf", 27)
    semibold20 = font("seguisb.ttf", 20)
    semibold24 = font("seguisb.ttf", 24)
    bold28 = font("segoeuib.ttf", 28)
    bold44 = font("segoeuib.ttf", 44)
    bold66 = font("segoeuib.ttf", 66)
    draw.ellipse((74, 70, 158, 154), fill="#344f5d")
    draw.polygon([(74, 127), (158, 106), (158, 154), (74, 154)], fill="#6f7651")
    draw.text((101, 83), "A", font=bold44, fill="#ffffff")
    draw.text((182, 78), TEXT_LINES[0], font=semibold24, fill="#4f583d")
    draw.text((182, 111), TEXT_LINES[1], font=bold28, fill="#344f5d")
    draw.text((74, 215), TEXT_LINES[2], font=bold66, fill="#28383f")
    draw.text((74, 300), TEXT_LINES[3], font=bold66, fill="#344f5d")
    draw.text((78, 398), TEXT_LINES[4], font=regular, fill="#52656d")
    draw.text((78, 438), TEXT_LINES[5], font=regular, fill="#52656d")
    draw.rounded_rectangle((75, 505, 700, 555), radius=25, fill="#fcfaf6", outline="#b8b6aa", width=2)
    draw.text((98, 516), TEXT_LINES[6], font=semibold20, fill="#4f583d")
    draw.text((894, 588), TEXT_LINES[7], font=semibold20, fill="#fcfaf6")
    image.save(output, optimize=True)
    check = Image.open(output)
    if check.size != (WIDTH, HEIGHT) or check.mode != "RGB":
        raise ValueError("Social preview heeft onverwachte afmetingen of kleurmodus.")


if __name__ == "__main__":
    generate(Path(__file__).parents[1] / "assets" / "social-preview.png")
