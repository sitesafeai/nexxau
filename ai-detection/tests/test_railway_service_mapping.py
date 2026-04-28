import importlib.util
import sys
import types
import unittest
from pathlib import Path


def load_service_module():
    sys.modules.setdefault(
        'cv2',
        types.SimpleNamespace(CAP_FFMPEG=0, VideoCapture=lambda *args, **kwargs: None),
    )
    sys.modules.setdefault(
        'ultralytics',
        types.SimpleNamespace(YOLO=lambda *args, **kwargs: None),
    )

    module_path = Path(__file__).resolve().parents[1] / 'railway_service.py'
    spec = importlib.util.spec_from_file_location('railway_service_under_test', module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


service = load_service_module()


class RailwayServiceMappingTest(unittest.TestCase):
    def test_coco_class_names_do_not_use_ppe_numeric_order(self):
        coco_names = {
            0: 'person',
            1: 'bicycle',
            2: 'car',
            3: 'motorcycle',
            4: 'airplane',
        }

        self.assertEqual(service.map_detection_type(0, coco_names), 'person_detected')
        self.assertIsNone(service.map_detection_type(1, coco_names))
        self.assertIsNone(service.map_detection_type(2, coco_names))
        self.assertIsNone(service.map_detection_type(3, coco_names))
        self.assertIsNone(service.map_detection_type(4, coco_names))

    def test_ppe_class_names_are_mapped_by_semantics(self):
        ppe_names = {
            0: 'Hardhat',
            1: 'NO-Hardhat',
            2: 'NO-Safety Vest',
            3: 'Person',
            4: 'Safety Vest',
        }

        self.assertEqual(service.map_detection_type(0, ppe_names), 'helmet')
        self.assertEqual(service.map_detection_type(1, ppe_names), 'no_helmet')
        self.assertEqual(service.map_detection_type(2, ppe_names), 'no_vest')
        self.assertEqual(service.map_detection_type(3, ppe_names), 'person_detected')
        self.assertEqual(service.map_detection_type(4, ppe_names), 'vest')

    def test_legacy_numeric_mapping_is_only_used_without_names(self):
        self.assertEqual(service.map_detection_type(1, None), 'no_helmet')


if __name__ == '__main__':
    unittest.main()
