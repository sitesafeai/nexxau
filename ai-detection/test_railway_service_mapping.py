import importlib
import sys
import types
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))
sys.modules.setdefault('cv2', types.SimpleNamespace(CAP_FFMPEG=0, VideoCapture=lambda *args, **kwargs: None))
sys.modules.setdefault('ultralytics', types.SimpleNamespace(YOLO=object))

railway_service = importlib.import_module('railway_service')


class ModelWithNames:
    def __init__(self, names):
        self.names = names


class RailwayServiceMappingTest(unittest.TestCase):
    def test_missing_custom_model_fallback_uses_coco_person_mapping(self):
        model = ModelWithNames({0: 'person', 1: 'bicycle'})

        violation_map = railway_service.build_violation_map('yolov8n.pt', model)

        self.assertEqual({0: 'person_detected'}, violation_map)

    def test_coco_names_on_nonstandard_path_use_coco_person_mapping(self):
        model = ModelWithNames(['person', 'bicycle', 'car'])

        violation_map = railway_service.build_violation_map('/models/custom-name.pt', model)

        self.assertEqual({0: 'person_detected'}, violation_map)

    def test_ppe_model_names_use_ppe_mapping(self):
        model = ModelWithNames({0: 'Hardhat', 1: 'NO-Hardhat', 2: 'NO-Safety Vest'})

        violation_map = railway_service.build_violation_map('/models/ppe.pt', model)

        self.assertEqual('helmet', violation_map[0])
        self.assertEqual('no_helmet', violation_map[1])
        self.assertEqual('no_vest', violation_map[2])


if __name__ == '__main__':
    unittest.main()
