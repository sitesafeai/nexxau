import importlib
import sys
import types
import unittest


if 'ultralytics' not in sys.modules:
    sys.modules['ultralytics'] = types.SimpleNamespace(YOLO=object)

railway_service = importlib.import_module('railway_service')


class ViolationMapTests(unittest.TestCase):
    def test_coco_names_only_map_person_class(self):
        mapping = railway_service.build_violation_map(
            {0: 'person', 1: 'bicycle', 2: 'car'},
            'custom-ppe-model.pt',
        )

        self.assertEqual(mapping, {0: 'person_detected'})

    def test_coco_resolved_path_falls_back_to_person_only(self):
        mapping = railway_service.build_violation_map(None, 'yolov8n.pt')

        self.assertEqual(mapping, {0: 'person_detected'})

    def test_ppe_model_names_map_to_violation_types(self):
        mapping = railway_service.build_violation_map(
            {
                0: 'Hardhat',
                1: 'NO-Hardhat',
                2: 'NO-Safety Vest',
                3: 'Person',
                4: 'Safety Vest',
                5: 'Worker',
            },
            'custom-ppe-model.pt',
        )

        self.assertEqual(
            mapping,
            {
                0: 'helmet',
                1: 'no_helmet',
                2: 'no_vest',
                3: 'person_detected',
                4: 'vest',
                5: 'person_detected',
            },
        )


if __name__ == '__main__':
    unittest.main()
