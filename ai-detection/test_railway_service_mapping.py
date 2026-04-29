import importlib.util
import pathlib
import sys
import types
import unittest


def load_railway_service():
    root = pathlib.Path(__file__).resolve().parent
    module_path = root / 'railway_service.py'

    sys.modules.setdefault('cv2', types.SimpleNamespace(CAP_FFMPEG=0, VideoCapture=lambda *args, **kwargs: None))
    sys.modules.setdefault('ultralytics', types.SimpleNamespace(YOLO=object))

    spec = importlib.util.spec_from_file_location('railway_service_under_test', module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


railway_service = load_railway_service()


class RailwayServiceMappingTest(unittest.TestCase):
    def test_coco_model_names_are_not_interpreted_as_ppe_class_order(self):
        coco_names = {
            0: 'person',
            1: 'bicycle',
            2: 'car',
            3: 'motorcycle',
            4: 'airplane',
        }

        self.assertEqual(railway_service.map_detection_type(0, coco_names), 'person_detected')
        self.assertIsNone(railway_service.map_detection_type(2, coco_names))
        self.assertIsNone(railway_service.map_detection_type(4, coco_names))

    def test_custom_ppe_model_names_map_to_ingest_types(self):
        ppe_names = {
            0: 'Hardhat',
            1: 'NO-Hardhat',
            2: 'NO-Safety Vest',
            3: 'Person',
            4: 'Safety Vest',
        }

        self.assertEqual(railway_service.map_detection_type(0, ppe_names), 'helmet')
        self.assertEqual(railway_service.map_detection_type(1, ppe_names), 'no_helmet')
        self.assertEqual(railway_service.map_detection_type(2, ppe_names), 'no_vest')
        self.assertEqual(railway_service.map_detection_type(3, ppe_names), 'person_detected')
        self.assertEqual(railway_service.map_detection_type(4, ppe_names), 'vest')

    def test_legacy_class_order_still_applies_when_model_names_are_missing(self):
        self.assertEqual(railway_service.map_detection_type(0, None), 'helmet')
        self.assertEqual(railway_service.map_detection_type(2, None), 'no_vest')


if __name__ == '__main__':
    unittest.main()
