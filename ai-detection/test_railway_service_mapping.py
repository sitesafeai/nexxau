import importlib.util
import sys
import types
import unittest
from pathlib import Path


def load_railway_service():
    sys.modules.setdefault('cv2', types.SimpleNamespace(CAP_FFMPEG=1900, VideoCapture=lambda *args, **kwargs: None))
    sys.modules.setdefault('ultralytics', types.SimpleNamespace(YOLO=object))

    module_path = Path(__file__).with_name('railway_service.py')
    spec = importlib.util.spec_from_file_location('railway_service_for_tests', module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


railway_service = load_railway_service()


class BuildViolationMapTest(unittest.TestCase):
    def test_coco_names_map_person_class_without_ppe_labels(self):
        violation_map = railway_service.build_violation_map(
            {0: 'person', 1: 'bicycle', 2: 'car'},
            'yolov8n.pt',
        )

        self.assertEqual(violation_map, {0: 'person_detected'})

    def test_ppe_names_are_mapped_by_loaded_labels_not_fixed_ids(self):
        violation_map = railway_service.build_violation_map(
            {
                0: 'Worker',
                3: 'NO-Hardhat',
                7: 'Safety Vest',
                9: 'NO-Safety Vest',
            },
            'custom-ppe.pt',
        )

        self.assertEqual(
            violation_map,
            {
                0: 'person_detected',
                3: 'no_helmet',
                7: 'vest',
                9: 'no_vest',
            },
        )

    def test_empty_coco_names_fallback_uses_resolved_model_path(self):
        violation_map = railway_service.build_violation_map({}, 'yolov8n.pt')

        self.assertEqual(violation_map, {0: 'person_detected'})


if __name__ == '__main__':
    unittest.main()
