from pathlib import Path
import unittest
from PIL import Image

SPRITES = Path(__file__).resolve().parents[1] / 'assets' / 'sprites'


class PatrolArt(unittest.TestCase):
    def test_tail_rotor_and_boom_are_visible_in_every_pose(self):
        with Image.open(SPRITES / 'suceso-helicoptero-8.webp') as sheet:
            self.assertEqual(sheet.size, (1320, 87))
            alpha = sheet.getchannel('A').point(lambda value: 255 if value >= 180 else 0)
            for index in range(8):
                with self.subTest(frame=index):
                    left = index * 165
                    rotor = alpha.crop((left + 16, 13, left + 50, 47))
                    self.assertGreater(rotor.histogram()[255], 120)
                    boom = alpha.crop((left + 45, 49, left + 67, 65))
                    for x in range(boom.width):
                        self.assertGreater(boom.crop((x, 0, x + 1, boom.height)).histogram()[255], 3)


if __name__ == '__main__':
    unittest.main()
