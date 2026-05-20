import importlib
import sys
import types
import unittest


def import_railway_service():
    sys.modules.setdefault(
        'cv2',
        types.SimpleNamespace(VideoCapture=object, CAP_FFMPEG=0),
    )
    ultralytics = types.ModuleType('ultralytics')
    ultralytics.YOLO = object
    sys.modules.setdefault('ultralytics', ultralytics)
    return importlib.import_module('railway_service')


class ViolationMapTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = import_railway_service()

    def test_coco_fallback_uses_coco_map(self):
        self.assertEqual(
            self.service.build_violation_map(
                'yolov8n.pt',
                {0: 'person', 1: 'bicycle', 2: 'car'},
            ),
            {0: 'person_detected'},
        )

    def test_ppe_names_are_used_even_with_stock_filename(self):
        self.assertEqual(
            self.service.build_violation_map(
                'yolov8n.pt',
                {
                    0: 'Hardhat',
                    1: 'NO-Hardhat',
                    2: 'NO-Safety Vest',
                    3: 'Person',
                    4: 'Safety Vest',
                    5: 'Worker',
                },
            ),
            {
                0: 'helmet',
                1: 'no_helmet',
                2: 'no_vest',
                3: 'person_detected',
                4: 'vest',
                5: 'person_detected',
            },
        )

    def test_known_coco_path_without_names_uses_coco_map(self):
        self.assertEqual(
            self.service.build_violation_map('/models/yolov8s.pt'),
            {0: 'person_detected'},
        )

    def test_unknown_custom_model_without_names_uses_ppe_map(self):
        self.assertEqual(
            self.service.build_violation_map('/models/custom-ppe.pt'),
            self.service.PPE_VIOLATION_MAP,
        )


if __name__ == '__main__':
    unittest.main()
