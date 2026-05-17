import sys
import types
import unittest


sys.modules.setdefault('cv2', types.SimpleNamespace(CAP_FFMPEG=0, VideoCapture=lambda *args, **kwargs: None))
sys.modules.setdefault('ultralytics', types.SimpleNamespace(YOLO=lambda *args, **kwargs: None))

import railway_service


class DetectionTypeMappingTest(unittest.TestCase):
    def test_default_coco_person_is_not_mapped_as_helmet(self):
        model_names = {0: 'person', 1: 'bicycle'}

        self.assertEqual(railway_service.map_detection_type(0, model_names), 'person_detected')
        self.assertIsNone(railway_service.map_detection_type(1, model_names))

    def test_custom_ppe_model_names_drive_violation_mapping(self):
        model_names = {
            0: 'Hardhat',
            1: 'NO-Hardhat',
            2: 'NO-Safety Vest',
            3: 'Person',
            4: 'Safety Vest',
        }

        self.assertEqual(railway_service.map_detection_type(0, model_names), 'helmet')
        self.assertEqual(railway_service.map_detection_type(1, model_names), 'no_helmet')
        self.assertEqual(railway_service.map_detection_type(2, model_names), 'no_vest')
        self.assertEqual(railway_service.map_detection_type(3, model_names), 'person_detected')
        self.assertEqual(railway_service.map_detection_type(4, model_names), 'vest')

    def test_legacy_mapping_is_used_when_model_names_are_unavailable(self):
        self.assertEqual(railway_service.map_detection_type(0), 'helmet')


if __name__ == '__main__':
    unittest.main()
